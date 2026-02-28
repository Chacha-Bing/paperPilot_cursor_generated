/**
 * DBService 单元测试
 *
 * 使用 fake-indexeddb 模拟 IndexedDB，验证 CRUD 逻辑
 */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { DBService } from "./db.service";

const dbService = new DBService();

beforeEach(async () => {
  await db.papers.clear();
  await db.anchors.clear();
  await db.messages.clear();
  await db.glossary.clear();
  await db.userProfile.clear();
});

describe("DBService", () => {
  describe("savePaperFromFile", () => {
    it("应从 File 构建 PaperRecord 并保存", async () => {
      const file = new File(["pdf content"], "paper.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 100 });
      Object.defineProperty(file, "lastModified", { value: 1234567890 });

      const record = await dbService.savePaperFromFile(file);

      expect(record.id).toContain("paper.pdf");
      expect(record.title).toBe("paper.pdf");
      expect(record.status).toBe("reading");
      expect(record.deconstruction).toEqual({
        motivation: "",
        method: "",
        result: "",
        gap: ""
      });

      const stored = await db.papers.get(record.id);
      expect(stored).toBeDefined();
      expect(stored?.title).toBe("paper.pdf");
    });
  });

  describe("getAllPapers", () => {
    it("应按 lastReadTime 倒序返回论文列表", async () => {
      const base = Date.now();
      await db.papers.add({
        id: "a",
        title: "A",
        fileData: new ArrayBuffer(0),
        status: "reading",
        progress: 0,
        lastReadTime: base,
        deconstruction: { motivation: "", method: "", result: "", gap: "" }
      });
      await db.papers.add({
        id: "b",
        title: "B",
        fileData: new ArrayBuffer(0),
        status: "reading",
        progress: 0,
        lastReadTime: base + 1000,
        deconstruction: { motivation: "", method: "", result: "", gap: "" }
      });

      const papers = await dbService.getAllPapers();
      expect(papers[0]?.id).toBe("b");
      expect(papers[1]?.id).toBe("a");
    });
  });

  describe("updatePaperDeconstruction", () => {
    it("应更新论文解构字段", async () => {
      await db.papers.add({
        id: "p1",
        title: "P1",
        fileData: new ArrayBuffer(0),
        status: "reading",
        progress: 0,
        lastReadTime: Date.now(),
        deconstruction: { motivation: "", method: "", result: "", gap: "" }
      });

      await dbService.updatePaperDeconstruction("p1", {
        motivation: "m",
        method: "meth",
        result: "r",
        gap: "g"
      });

      const paper = await db.papers.get("p1");
      expect(paper?.deconstruction?.motivation).toBe("m");
      expect(paper?.deconstruction?.method).toBe("meth");
    });
  });

  describe("saveAnchors / getAnchors", () => {
    it("应先清空再保存锚点，并能正确读取", async () => {
      await dbService.saveAnchors("p1", [
        { id: "a1", paperId: "p1", pageHint: 1, anchorText: "text", chachaComment: "comment" }
      ]);

      let anchors = await dbService.getAnchors("p1");
      expect(anchors).toHaveLength(1);
      expect(anchors[0]?.anchorText).toBe("text");

      await dbService.saveAnchors("p1", [
        { id: "a2", paperId: "p1", pageHint: 2, anchorText: "new", chachaComment: "c2" }
      ]);
      anchors = await dbService.getAnchors("p1");
      expect(anchors).toHaveLength(1);
      expect(anchors[0]?.anchorText).toBe("new");
    });
  });

  describe("addMessage / getMessages", () => {
    it("应正确添加并按时间排序获取消息", async () => {
      await dbService.addMessage({
        paperId: "p1",
        role: "user",
        content: "hi",
        timestamp: 1000
      });
      await dbService.addMessage({
        paperId: "p1",
        role: "assistant",
        content: "hello",
        timestamp: 2000
      });

      const messages = await dbService.getMessages("p1");
      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("hi");
      expect(messages[1]?.content).toBe("hello");
    });
  });
});
