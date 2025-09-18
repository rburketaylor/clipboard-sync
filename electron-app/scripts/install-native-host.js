#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOST_NAME = 'com.clipboardsync.host';
const HOST_SCRIPT_BASENAME = 'native-host.js';
const HOST_WRAPPER_BASENAME = 'native-host';

function usage() {
  console.log(`Usage: node scripts/install-native-host.js --extension-id <id> [options]

Options:
  --extension-id <id>   Chrome extension ID (repeat to allow multiples)
  --browser <name>      Browser family (chrome|chromium|chrome-flatpak), default chrome
  --dry-run             Print planned manifest location without writing
  --help                Show this message

Examples:
  node scripts/install-native-host.js --extension-id abcdefghijklmnop
  EXTENSION_ID=abcdefghijklmnop npm run install-native-host
`);
}

function normalizeOrigin(id) {
  const trimmed = String(id).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('chrome-extension://')) {
    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }
  return `chrome-extension://${trimmed.replace(/\/$/, '')}/`;
}

function parseArgs(argv) {
  const result = {
    extensionIds: [],
    browser: 'chrome',
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--browser') {
      i += 1;
      result.browser = argv[i] || result.browser;
    } else if (arg.startsWith('--browser=')) {
      result.browser = arg.split('=')[1] || result.browser;
    } else if (arg === '--extension-id') {
      i += 1;
      if (argv[i]) result.extensionIds.push(argv[i]);
    } else if (arg.startsWith('--extension-id=')) {
      result.extensionIds.push(arg.split('=')[1]);
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      usage();
      process.exit(1);
    } else {
      result.extensionIds.push(arg);
    }
  }

  if (process.env.EXTENSION_ID) {
    result.extensionIds.push(process.env.EXTENSION_ID);
  }

  result.extensionIds = Array.from(new Set(result.extensionIds.filter(Boolean)));
  return result;
}

function resolvePaths(browser) {
  const home = os.homedir();
  const hostScriptSource = path.resolve(__dirname, '..', HOST_SCRIPT_BASENAME);
  const manifestFilename = `${HOST_NAME}.json`;

  if (!fs.existsSync(hostScriptSource)) {
    throw new Error(`Native host script not found at ${hostScriptSource}`);
  }

  if (process.platform === 'darwin') {
    const manifestPath = path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts', manifestFilename);
    return {
      manifestPath,
      hostScriptSource,
      hostScriptPath: hostScriptSource,
      hostExecutablePath: hostScriptSource,
      copyHost: false
    };
  }

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const manifestPath = path.join(localAppData, 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts', manifestFilename);
    return {
      manifestPath,
      hostScriptSource,
      hostScriptPath: hostScriptSource,
      hostExecutablePath: hostScriptSource,
      copyHost: false
    };
  }

  if (process.platform === 'linux') {
    if (browser === 'chrome-flatpak') {
      const installRoot = path.join(home, '.var', 'app', 'com.google.Chrome');
      const manifestPath = path.join(installRoot, 'config', 'google-chrome', 'NativeMessagingHosts', manifestFilename);
      const hostScriptPath = path.join(installRoot, 'native-messaging-hosts', HOST_SCRIPT_BASENAME);
      const hostExecutablePath = path.join(installRoot, 'native-messaging-hosts', HOST_WRAPPER_BASENAME);
      return {
        manifestPath,
        hostScriptSource,
        hostScriptPath,
        hostExecutablePath,
        copyHost: true,
        wrapperVariant: 'flatpak'
      };
    }

    // default linux (deb/pacman/aur installation)
    const base = browser === 'chromium'
      ? path.join(home, '.config', 'chromium')
      : path.join(home, '.config', 'google-chrome');
    const manifestPath = path.join(base, 'NativeMessagingHosts', manifestFilename);
    return {
      manifestPath,
      hostScriptSource,
      hostScriptPath: hostScriptSource,
      hostExecutablePath: hostScriptSource,
      copyHost: false
    };
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function ensureExecutable(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mode = stats.mode & 0o777;
    if ((mode & 0o111) === 0) {
      fs.chmodSync(filePath, 0o755);
    }
  } catch (err) {
    console.warn(`Warning: unable to adjust permissions on ${filePath}: ${err.message}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.extensionIds.length === 0) {
    console.error('Error: at least one --extension-id is required.');
    usage();
    process.exit(1);
  }

  const allowedOrigins = args.extensionIds
    .map(normalizeOrigin)
    .filter(Boolean);

  if (!allowedOrigins.length) {
    console.error('Error: no valid extension IDs provided.');
    process.exit(1);
  }

  let paths;
  try {
    paths = resolvePaths(args.browser);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const manifestPath = paths.manifestPath;
  const manifestDir = path.dirname(manifestPath);

  const manifest = {
    name: HOST_NAME,
    description: 'Clipboard Sync native messaging host',
    path: paths.hostExecutablePath,
    type: 'stdio',
    allowed_origins: allowedOrigins
  };

  console.log(`Native messaging host manifest will be written to:\n  ${manifestPath}`);
  console.log(`Allowed origins:\n  ${allowedOrigins.join('\n  ')}`);
  console.log(`Host script source:\n  ${paths.hostScriptSource}`);
  if (paths.copyHost) {
    console.log(`Host script target:\n  ${paths.hostScriptPath}`);
    console.log(`Host executable:\n  ${paths.hostExecutablePath}`);
  }

  if (args.dryRun) {
    console.log('Dry run mode; no files were written.');
    return;
  }

  if (paths.copyHost) {
    fs.mkdirSync(path.dirname(paths.hostScriptPath), { recursive: true });
    fs.copyFileSync(paths.hostScriptSource, paths.hostScriptPath);
    const nodeExecutables = Array.from(new Set([
      process.execPath,
      '/usr/bin/node',
      '/usr/local/bin/node'
    ].filter(p => typeof p === 'string' && p.length > 0)));
    const hostScriptRel = `$(dirname "\$0")/${HOST_SCRIPT_BASENAME}`;
    let wrapperContents;

    if (paths.wrapperVariant === 'flatpak') {
      const candidates = nodeExecutables.map(p => `"${p}"`).join(' ');
      wrapperContents = `#!/bin/sh\nSCRIPT=\"${hostScriptRel}\"\nif command -v flatpak-spawn >/dev/null 2>&1; then\n  for candidate in ${candidates}; do\n    if flatpak-spawn --host test -x \"$candidate\"; then\n      exec flatpak-spawn --host \"$candidate\" \"$SCRIPT\" \"$@\"\n    fi\n  done\n  exec flatpak-spawn --host /usr/bin/env node \"$SCRIPT\" \"$@\"\nfi\nfor candidate in ${candidates}; do\n  if [ -x \"$candidate\" ]; then\n    exec \"$candidate\" \"$SCRIPT\" \"$@\"\n  fi\n done\nexec /usr/bin/env node \"$SCRIPT\" \"$@\"\n`;
    } else {
      const first = nodeExecutables[0];
      const rest = nodeExecutables.slice(1).map(p => `\"${p}\"`).join(' ');
      wrapperContents = `#!/bin/sh\nNODE_PATH=\"${first}\"\nif [ -x \"$NODE_PATH\" ]; then\n  exec \"$NODE_PATH\" \"${hostScriptRel}\" \"$@\"\nfi\nfor candidate in ${rest}\n do\n  if [ -x \"$candidate\" ]; then\n    exec \"$candidate\" \"${hostScriptRel}\" \"$@\"\n  fi\n done\nexec /usr/bin/env node \"${hostScriptRel}\" \"$@\"\n`;
    }
    fs.writeFileSync(paths.hostExecutablePath, wrapperContents, { mode: 0o755 });
  }
  ensureExecutable(paths.hostExecutablePath);
  ensureExecutable(paths.hostScriptPath);

  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('Manifest written successfully.');

  if (paths.wrapperVariant === 'flatpak') {
    const overrideArgs = ['override', '--user', '--talk-name=org.freedesktop.Flatpak', 'com.google.Chrome'];
    const result = spawnSync('flatpak', overrideArgs, { stdio: 'inherit' });
    if (result.error) {
      if (result.error.code === 'ENOENT') {
        console.warn('Flatpak CLI not found; run "flatpak override --user --talk-name=org.freedesktop.Flatpak com.google.Chrome" manually.');
      } else {
        console.warn(`Flatpak override failed: ${result.error.message}`);
      }
    } else if (result.status !== 0) {
      console.warn('flatpak override exited with non-zero status; rerun manually if needed.');
    } else {
      console.log('Flatpak override applied for com.google.Chrome');
    }
  }

  if (process.platform === 'win32') {
    console.log('\nWindows requires an additional registry entry:');
    console.log(`  reg add HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME} /ve /t REG_SZ /d "${manifestPath}" /f`);
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
