import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import process from 'node:process';

const baseApiPort = Number(process.env.API_PORT || 3001);
const children = [];
let stopping = false;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function canListen(port) {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isHealthyApi(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok && (await response.json()).status === 'ok';
  } catch {
    return false;
  }
}

async function selectApiPort() {
  for (let port = baseApiPort; port < baseApiPort + 50; port += 1) {
    if (await canListen(port)) {
      return { port, startServer: true };
    }
    if (await isHealthyApi(port)) {
      return { port, startServer: false };
    }
  }

  throw new Error(`No available API port found between ${baseApiPort} and ${baseApiPort + 49}.`);
}

function startChild(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });
  children.push({ label, child });

  child.once('error', (error) => {
    console.error(`Could not start ${label}:`, error.message);
    shutdown(1);
  });
  child.once('close', (code) => {
    if (!stopping) {
      console.error(`${label} stopped${code === null ? '' : ` with exit code ${code}`}.`);
      shutdown(code || 1);
    }
  });

  return child;
}

async function waitForApi(port, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error('The Gemini API server exited before it became ready.');
    }
    if (await isHealthyApi(port)) return;
    await delay(200);
  }
  throw new Error(`Gemini API server did not become ready on port ${port}.`);
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;

  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

try {
  const { port, startServer } = await selectApiPort();
  const env = {
    ...process.env,
    API_PORT: String(port),
    VITE_API_PORT: String(port),
  };

  if (startServer) {
    const api = startChild('Gemini API server', process.execPath, ['server.js'], env);
    await waitForApi(port, api);
  } else {
    console.log(`Reusing the healthy Gemini API server on port ${port}.`);
  }

  console.log(`Gemini API available at http://127.0.0.1:${port}`);
  startChild('Vite development server', process.execPath, ['node_modules/vite/bin/vite.js'], env);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
