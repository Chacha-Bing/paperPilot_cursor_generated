/**
 * AC 自动机 Web Worker
 * 一次扫描文本，返回所有术语命中的 [start, end, term]
 * 避免主线程阻塞
 */

export interface ACMatch {
  term: string;
  start: number;
  end: number;
}

export interface ACWorkerRequest {
  type: "search";
  id: number;
  text: string;
  terms: string[];
}

export interface ACWorkerResponse {
  type: "result";
  id: number;
  matches: ACMatch[];
}

/** Trie 节点 */
interface ACNode {
  children: Map<string, ACNode>;
  fail: ACNode | null;
  output: string[]; // 以该节点结尾的模式串
}

function buildAC(terms: string[]): ACNode {
  const root: ACNode = {
    children: new Map(),
    fail: null,
    output: []
  };

  // 构建 Trie
  for (const term of terms) {
    const t = term.trim();
    if (!t) continue;
    let node = root;
    for (const ch of t) {
      let next = node.children.get(ch);
      if (!next) {
        next = { children: new Map(), fail: null, output: [] };
        node.children.set(ch, next);
      }
      node = next;
    }
    node.output.push(t);
  }

  // BFS 构建失败指针
  const queue: ACNode[] = [];
  for (const [ch, child] of root.children) {
    child.fail = root;
    queue.push(child);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const [ch, child] of node.children) {
      let fail = node.fail;
      while (fail && !fail.children.get(ch)) {
        fail = fail.fail;
      }
      child.fail = fail?.children.get(ch) ?? root;
      child.output = [...child.output, ...(child.fail.output ?? [])];
      queue.push(child);
    }
  }

  return root;
}

function searchAC(text: string, terms: string[]): ACMatch[] {
  const trimmed = terms.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  const root = buildAC(trimmed);
  const matches: ACMatch[] = [];
  let node: ACNode = root;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    while (node !== root && !node.children.get(ch)) {
      node = node.fail!;
    }
    const next = node.children.get(ch);
    if (next) {
      node = next;
      for (const term of node.output) {
        matches.push({ term, start: i - term.length + 1, end: i + 1 });
      }
    }
  }

  return matches;
}

let nextId = 0;

self.onmessage = (e: MessageEvent<ACWorkerRequest>) => {
  const { type, id, text, terms } = e.data;
  if (type !== "search") return;

  const matches = searchAC(text, terms);
  const response: ACWorkerResponse = { type: "result", id, matches };
  self.postMessage(response);
};
