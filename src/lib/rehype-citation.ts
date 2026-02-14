/**
 * rehype-citation - 将 [[page, line]] 转为可点击引用链接
 *
 * 用于 ChatPanel 的 Markdown 渲染，配合 CitationLink 实现跳转到 PDF 指定页/行。
 */
import type { Root, Text, Element } from "hast";
import { visit } from "unist-util-visit";

const CITATION_REGEX = /\[\[(\d+),\s*(\d+)\]\]/g;

/** 在 hast 树中将 [[page, line]] 文本替换为可点击的链接，供 CitationLink 组件渲染 */
export function rehypeCitation() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined || typeof node.value !== "string") return;
      const parts = node.value.split(CITATION_REGEX);
      if (parts.length <= 1) return;

      const newNodes: Array<Text | Element> = [];
      for (let i = 0; i < parts.length; i++) {
        if (i % 3 === 0) {
          if (parts[i]) newNodes.push({ type: "text", value: parts[i] as string });
        } else if (i % 3 === 1) {
          const page = parseInt(parts[i] ?? "1", 10);
          const line = parseInt(parts[i + 1] ?? "1", 10);
          newNodes.push({
            type: "element",
            tagName: "a",
            properties: {
              href: `#cite-${page}-${line}`,
              className: ["citation-link"]
            },
            children: [{ type: "text", value: `第 ${page} 页第 ${line} 行` }]
          });
        }
      }

      (parent.children as Array<Text | Element>).splice(index, 1, ...newNodes);
    });
  };
}
