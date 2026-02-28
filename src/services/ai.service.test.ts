/**
 * AIService 单元测试
 *
 * 测试 JSON 清洗逻辑（sanitizeJsonString）及 preparse 的 JSON 解析
 * OpenAI 客户端已 mock，不发起真实请求
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIService } from "./ai.service";

// 导出 sanitizeJsonString 以便测试（通过动态 import 或复制逻辑）
// 由于未导出，我们通过 preparse 的输入输出来间接测试
// 这里改为 mock OpenAI 并测试 preparse 的解析逻辑

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate
      }
    };
  }
}));

describe("AIService", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("preparse", () => {
    it("应正确解析 AI 返回的 JSON（含 markdown 包裹）", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"deconstruction":{"motivation":"m","method":"meth","result":"r","gap":"g"},"logic_anchors":[]}\n```'
            }
          }
        ]
      });

      const ai = new AIService("sk-test");
      const result = await ai.preparse("text", "title");

      expect(result.deconstruction.motivation).toBe("m");
      expect(result.deconstruction.method).toBe("meth");
      expect(result.logic_anchors).toEqual([]);
    });

    it("应处理字符串内未转义换行导致的 Bad control character", async () => {
      // AI 可能返回字符串内包含真实换行，导致 JSON.parse 失败
      const badJson = '{"deconstruction":{"motivation":"line1\nline2","method":"m","result":"r","gap":"g"},"logic_anchors":[]}';
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: badJson } }]
      });

      const ai = new AIService("sk-test");
      const result = await ai.preparse("text", "title");

      expect(result.deconstruction.motivation).toContain("line1");
      expect(result.deconstruction.motivation).toContain("line2");
    });
  });
});
