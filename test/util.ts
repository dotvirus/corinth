import execa from "execa";
import { platform } from "os";
import { rmdirSync, existsSync } from "fs";
import debug from "debug";

export const PORT = +(process.env.CORINTH_PORT || 6767);
export const IP = `http://localhost:${PORT}`;
export const getUrl = (route: string) => IP + route;

const logMessage = debug("corinth:test:message");
const logError = debug("corinth:test:error");
const corinthLog = debug("corinth");

export function persistenceTeardown() {
  logMessage("Running test teardown");

  try {
    rmdirSync(".corinth", { recursive: true });
  } catch (error) {}

  if (existsSync(".corinth")) {
    logError("Test teardown failed");
    process.exit(1);
  }
}

export function countSync<T>(
  arr: T[],
  pred: (item: T, index: number, arr: T[]) => boolean
) {
  let count = 0;
  arr.forEach((item, i, arr) => {
    if (pred(item, i, arr)) {
      count++;
    }
  });
  return count;
}

// Return cross-platform file name of executable
// myfile for Linux & Mac
// myfile.exe for Windows
function executableName(filename: string) {
  return filename + (platform() === "win32" ? ".exe" : "");
}

export function spawnCorinth(port = PORT) {
  const exeName = executableName("corinth");
  const path = `./target/debug/${exeName}`;
  debug("test:message")(`Spawning ${path} with port ${port}`);
  const proc = execa(path, {
    env: {
      CORINTH_PORT: port.toString(),
    },
  });
  proc.stderr?.on("data", (msg) => {
    corinthLog(msg.toString());
  });
  return proc;
}

export function unixToHammer(unix: number) {
  return unix * 1000;
}

export const NO_FAIL = () => ({
  validateStatus: () => true,
});

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
