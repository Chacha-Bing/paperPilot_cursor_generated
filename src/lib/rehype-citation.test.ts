/**
 * rehype-citation 单元测试
 *
 * 验证 [[page, line]] 被正确转换为可点击链接节点
 */
import { describe, it, expect } from "vitest";
import { rehypeCitation } from "./rehype-citation";
import type { Root, Text, Element } from "hast";

function createTextNode(value: string): Text {
  return { type: "text", value };
}

function createRoot(children: Array<Text | Element>): Root {
  return { type: "root", children };
}

describe("rehypeCitation", () => {
  it("应将 [[1, 2]] 转为带 href 的链接", () => {
    const textNode = createTextNode("见第 [[1, 2]] 行");
    const parent = { type: "element" as const, tagName: "p", children: [textNode], properties: {} };
    const tree = createRoot([parent]);

    rehypeCitation()(tree);

    const children = parent.children as Array<Text | Element>;
    expect(children).toHaveLength(3); // "见第 " + link + " 行"
    const link = children[1];
    expect(link.type).toBe("element");
    expect((link as Element).tagName).toBe("a");
    expect((link as Element).properties?.href).toBe("#cite-1-2");
    expect((link as Element).properties?.className).toContain("citation-link");
  });

  it("应处理多个引用 [[1,2]] 和 [[3,4]]", () => {
    const textNode = createTextNode("[[1,2]] 与 [[3,4]]");
    const parent = { type: "element" as const, tagName: "p", children: [textNode], properties: {} };
    const tree = createRoot([parent]);

    rehypeCitation()(tree);

    const children = parent.children as Array<Text | Element>;
    const links = children.filter((n): n is Element => n.type === "element");
    expect(links).toHaveLength(2);
    expect(links[0]?.properties?.href).toBe("#cite-1-2");
    expect(links[1]?.properties?.href).toBe("#cite-3-4");
  });

  it("无 [[page, line]] 时不应修改节点", () => {
    const textNode = createTextNode("普通文本，无引用");
    const parent = { type: "element" as const, tagName: "p", children: [textNode], properties: {} };
    const tree = createRoot([parent]);

    rehypeCitation()(tree);

    expect(parent.children).toHaveLength(1);
    expect((parent.children[0] as Text).value).toBe("普通文本，无引用");
  });
});
