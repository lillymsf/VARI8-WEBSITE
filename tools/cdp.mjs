// Minimal CDP driver for headless Chrome — Node 24 globals only
// (WebSocket, fetch), no dependencies.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

export const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Launches headless Chrome with a throwaway profile and returns a
 * session-scoped CDP client.
 * @returns {Promise<{
 *   send(method: string, params?: object): Promise<any>,
 *   evaluate(expr: string): Promise<any>,
 *   on(event: string, fn: (params: any) => void): void,
 *   setViewport(width:number,height:number,dpr:number,mobile:boolean):Promise<any>,
 *   close(): Promise<void>,
 * }>}
 */
export async function launchChrome({
  width = 1440,
  height = 900,
  dpr = 1,
  mobile = false,
} = {}) {
  const runId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const userDataDir = `/tmp/vari8-capture/profile-${runId}`;

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const portFile = `${userDataDir}/DevToolsActivePort`;
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    if (existsSync(portFile)) {
      port = readFileSync(portFile, "utf8").split("\n")[0].trim() || undefined;
    }
    if (!port) await delay(200);
  }
  if (!port) {
    chrome.kill("SIGKILL");
    throw new Error("Chrome did not expose DevToolsActivePort");
  }

  const version = await (
    await fetch(`http://127.0.0.1:${port}/json/version`)
  ).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const slot = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(`${msg.error.message}`));
      else slot.resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    }
  };

  const rawSend = (method, params = {}, sessionId) => {
    const id = ++nextId;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, 120000);
    });
  };

  const { targetId } = await rawSend("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await rawSend("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await rawSend("Page.enable", {}, sessionId);
  await rawSend("Runtime.enable", {}, sessionId);
  await rawSend(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: dpr, mobile },
    sessionId,
  );

  return {
    send: (method, params = {}) => rawSend(method, params, sessionId),
    evaluate: async (expression) => {
      const res = await rawSend(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      );
      if (res.exceptionDetails)
        throw new Error(
          `evaluate failed: ${JSON.stringify(res.exceptionDetails).slice(0, 600)}`,
        );
      return res.result?.value;
    },
    on: (event, fn) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    setViewport: (w, h, d, m) =>
      rawSend(
        "Emulation.setDeviceMetricsOverride",
        { width: w, height: h, deviceScaleFactor: d, mobile: m },
        sessionId,
      ),
    close: async () => {
      try {
        await rawSend("Browser.close");
      } catch {}
      try {
        chrome.kill("SIGKILL");
      } catch {}
      try {
        ws.close();
      } catch {}
    },
  };
}
