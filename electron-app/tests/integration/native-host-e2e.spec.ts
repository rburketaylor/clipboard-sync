import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'http';
import { spawn } from 'child_process';
import path from 'path';

function encodeNativeMessage(message: Record<string, any>) {
  const json = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  return Buffer.concat([header, json]);
}

function decodeNativeMessages(buffer: Buffer) {
  const messages: any[] = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    if (offset + 4 + length > buffer.length) break;
    const payload = buffer.subarray(offset + 4, offset + 4 + length);
    messages.push(JSON.parse(payload.toString('utf8')));
    offset += 4 + length;
  }
  return { messages, remainder: buffer.subarray(offset) };
}

describe('native host end-to-end', () => {
  const received: any[] = [];
  let server: ReturnType<typeof createServer>;
  let port: number;
  let child: ReturnType<typeof spawn> | null = null;

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/clip') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
          try {
            received.push(JSON.parse(body || '{}'));
          } catch {
            received.push({ error: 'parse' });
          }
          res.writeHead(201, { 'Content-Type': 'application/json' }).end('{}');
        });
        return;
      }
      res.writeHead(404).end();
    });

    await new Promise<void>(resolve => server.listen(0, resolve));
    port = (server.address() as any).port;

    child = spawn('node', ['native-host.js'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${port}` }
    });
  }, 10_000);

  afterAll(async () => {
    child?.kill();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('forwards clip messages to the backend and responds with success', async () => {
    if (!child) throw new Error('child process missing');

    const bufferChunks: Buffer[] = [];
    let accumulated = Buffer.alloc(0);

    const responsePromise = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('native host timeout')), 5000);
      child!.stdout.on('data', chunk => {
        bufferChunks.push(chunk as Buffer);
        accumulated = Buffer.concat(bufferChunks);
        const { messages, remainder } = decodeNativeMessages(accumulated);
        if (messages.length > 0) {
          clearTimeout(timeout);
          resolve(messages[0]);
        }
        accumulated = remainder;
      });
      child!.stderr.on('data', chunk => {
        // Surface stderr for debugging if test fails
        process.stderr.write(chunk);
      });
    });

    const clipMessage = { kind: 'clip', requestId: 42, payload: { type: 'text', content: 'hi from test' } };
    child.stdin.write(encodeNativeMessage(clipMessage));

    const response = await responsePromise;
    expect(response).toEqual({ kind: 'clipResult', ok: true, requestId: 42 });
    expect(received).toContainEqual(expect.objectContaining({
      type: 'text',
      content: 'hi from test',
      source: 'electron'
    }));
  }, 10_000);
});
