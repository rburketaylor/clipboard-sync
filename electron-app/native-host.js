#!/usr/bin/env node

/*
 * Native messaging host entry point for Clipboard Sync.
 *
 * Chrome launches this process and communicates over stdin/stdout.
 * Each message is encoded with a 4-byte little-endian length prefix
 * followed by UTF-8 JSON payload. We forward clipboard payloads to
 * the backend HTTP API so the Electron UI can remain unaware of the
 * transport details.
 */

const { URL } = require('url');
const { normalizeClipPayload } = require('./shared/clip-payload');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 5000;

let inputBuffer = Buffer.alloc(0);

function logDebug(message) {
  if (process.env.NATIVE_HOST_DEBUG) {
    process.stderr.write(`[native-host] ${message}\n`);
  }
}

function writeNativeMessage(data) {
  const json = JSON.stringify(data);
  const payload = Buffer.from(json, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  process.stdout.write(header);
  process.stdout.write(payload);
}

async function postClip(payload, backendBaseUrl, signal) {
  const trimmed = typeof backendBaseUrl === 'string' ? backendBaseUrl.trim() : '';
  const base = trimmed ? trimmed : BACKEND_URL;
  const endpoint = new URL('/clip', base);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend responded ${response.status}${text ? `: ${text}` : ''}`);
  }
}

async function handleMessage(message) {
  const { kind, requestId } = message || {};

  if (!requestId) {
    logDebug('Received message without requestId; ignoring');
    return;
  }

  try {
    if (kind === 'ping') {
      writeNativeMessage({ kind: 'pong', requestId, ok: true });
      return;
    }

    if (kind === 'clip') {
      const { payload, backendBaseUrl } = message;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Missing payload for clip message');
      }

      const normalizedPayload = normalizeClipPayload(payload);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        await postClip(normalizedPayload, backendBaseUrl, controller.signal);
      } finally {
        clearTimeout(timeout);
      }

      writeNativeMessage({ kind: 'clipResult', requestId, ok: true });
      return;
    }

    throw new Error(`Unsupported message kind: ${kind}`);
  } catch (err) {
    let error = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && err.name === 'AbortError') {
      error = 'Timed out contacting backend';
    }
    logDebug(`Error handling message: ${error}`);
    writeNativeMessage({ kind: 'error', requestId, ok: false, error });
  }
}

function processInputBuffer() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);
    if (inputBuffer.length < 4 + messageLength) {
      return;
    }

    const raw = inputBuffer.subarray(4, 4 + messageLength).toString('utf8');
    inputBuffer = inputBuffer.subarray(4 + messageLength);

    try {
      const message = JSON.parse(raw);
      handleMessage(message);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logDebug(`Failed to parse message: ${error}`);
    }
  }
}

function appendChunk(chunk) {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
}

function start() {
  logDebug('Native host starting');
  process.stdin.on('data', chunk => {
    appendChunk(chunk);
    processInputBuffer();
  });

  process.stdin.on('end', () => {
    logDebug('stdin ended; exiting');
    process.exit(0);
  });

  process.stdin.on('error', err => {
    logDebug(`stdin error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });

  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

function resetStateForTests() {
  inputBuffer = Buffer.alloc(0);
}

if (require.main === module) {
  start();
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  BACKEND_URL,
  appendChunk,
  handleMessage,
  postClip,
  processInputBuffer,
  resetStateForTests,
  start,
  writeNativeMessage
};
