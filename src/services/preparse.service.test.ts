/**
 * preparse.service 单元测试
 *
 * 测试 AI 返回解析逻辑（字段兼容 deconstruction/core_deconstruction 等）
 * preparseAction 与 PdfService 已 mock
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { runPreparse } from "./preparse.service";
import { preparseAction } from "@/app/actions/preparse";

vi.mock("@/app/actions/preparse");
vi.mock("@/services/pdf.service", () => ({
  PdfService: class MockPdfService {
    loadFromArrayBuffer = vi.fn().mockResolvedValue({ doc: {} });
    extractTextForPreparse = vi.fn().mockResolvedValue({ fullText: "Abstract. Intro. Method. Result." });
  }
}));

beforeEach(async () => {
  await db.papers.clear();
  await db.anchors.clear();
  await db.glossary.clear();
  vi.mocked(preparseAction).mockReset();
});

describe("runPreparse", () => {
  it("当论文已预解析完成时应跳过 AI 调用", async () => {
    await db.papers.add({
      id: "p1",
      title: "P1",
      fileData: new ArrayBuffer(0),
      status: "reading",
      progress: 0,
      lastReadTime: Date.now(),
      deconstruction: {
        motivation: "m",
        method: "meth",
        result: "r",
        gap: "g"
      }
    });

    const progressCalls: Array<{ stage: string }> = [];
    await runPreparse("p1", (p) => progressCalls.push({ stage: p.stage }));

    expect(preparseAction).not.toHaveBeenCalled();
    expect(progressCalls.some((c) => c.stage === "done")).toBe(true);
  });

  it("应兼容 core_deconstruction 和 logical_anchors 字段", async () => {
    await db.papers.add({
      id: "p1",
      title: "P1",
      fileData: new ArrayBuffer(0),
      status: "reading",
      progress: 0,
      lastReadTime: Date.now(),
      deconstruction: { motivation: "", method: "", result: "", gap: "" }
    });

    vi.mocked(preparseAction).mockResolvedValue({
      core_deconstruction: {
        motivation: "mot",
        method: "meth",
        result: "res",
        gap: "gap"
      },
      logical_anchors: [
        { anchor_text: "key sentence", page_hint: 2, chacha_comment: "注意这里" }
      ],
      knowledge_discovery: [{ term: "SOTA", definition: "state of the art" }]
    } as never);

    await runPreparse("p1");

    const paper = await db.papers.get("p1");
    expect(paper?.deconstruction?.motivation).toBe("mot");
    expect(paper?.deconstruction?.method).toBe("meth");

    const anchors = await db.anchors.where("paperId").equals("p1").toArray();
    expect(anchors).toHaveLength(1);
    expect(anchors[0]?.anchorText).toBe("key sentence");
    expect(anchors[0]?.chachaComment).toBe("注意这里");

    const glossary = await db.glossary.where("word").equals("SOTA").toArray();
    expect(glossary).toHaveLength(1);
    expect(glossary[0]?.explanation).toContain("state of the art");
  });

  it("论文不存在时应抛出错误", async () => {
    await expect(runPreparse("nonexistent")).rejects.toThrow("论文不存在");
    expect(preparseAction).not.toHaveBeenCalled();
  });
});
