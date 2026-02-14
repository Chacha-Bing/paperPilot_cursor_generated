/**
 * AC 自动机术语匹配服务
 * 在 Web Worker 中执行匹配，避免阻塞主线程
 */

import type { ACMatch, ACWorkerRequest, ACWorkerResponse } from "@/workers/ac-search.worker";

let workerInstance: Worker | null = null;
const pending = new Map<number, { resolve: (m: ACMatch[]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (workerInstance) return workerInstance;
  workerInstance = new Worker(
    new URL("@/workers/ac-search.worker.ts", import.meta.url),
    { type: "module" }
  );
  workerInstance.onmessage = (e: MessageEvent<ACWorkerResponse>) => {
    const { type, id, matches } = e.data;
    if (type === "result") {
      const p = pending.get(id);
      if (p) {
        pending.delete(id);
        p.resolve(matches);
      }
    }
  };
  workerInstance.onerror = (err) => {
    for (const [, p] of pending) p.reject(err.error ?? new Error("Worker error"));
    pending.clear();
  };
  return workerInstance;
}

let reqId = 0;

/**
 * 在 Worker 中执行 AC 匹配，返回所有命中的 [start, end, term]
 */
export function searchTermsInWorker(text: string, terms: string[]): Promise<ACMatch[]> {
  return new Promise((resolve, reject) => {
    const id = ++reqId;
    pending.set(id, { resolve, reject });
    const w = getWorker();
    const req: ACWorkerRequest = { type: "search", id, text, terms };
    w.postMessage(req);
  });
}
