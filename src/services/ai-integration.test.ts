/**
 * AI 集成测试（可选）
 *
 * 当 DEEPSEEK_API_KEY 配置时，调用真实 API 校验预解析返回格式。
 * 运行: npm run test:ai 或 DEEPSEEK_API_KEY=sk-xxx npm run test
 *
 * 不配置 API Key 时此测试会被跳过。
 */
import { describe, it, expect } from "vitest";
import { AIService } from "./ai.service";

const API_KEY = process.env.DEEPSEEK_API_KEY;

describe("AI 集成", () => {
  it.skipIf(!API_KEY)(
    "预解析 API 应返回符合 schema 的 JSON（deconstruction, logic_anchors, suggested_glossary）",
    async () => {
      const ai = new AIService(API_KEY!);
      const shortText = `
Abstract: We propose a novel method for efficient attention.
Introduction: Existing methods suffer from O(n^2) complexity.
Method: We use sparse attention to reduce to O(n).
Conclusion: Our method achieves 2x speedup.
      `.trim();

      const result = await ai.preparse(shortText, "Test Paper");

      expect(result).toBeDefined();
      expect(result.deconstruction).toBeDefined();
      expect(typeof result.deconstruction.motivation).toBe("string");
      expect(typeof result.deconstruction.method).toBe("string");
      expect(typeof result.deconstruction.result).toBe("string");
      expect(typeof result.deconstruction.gap).toBe("string");

      expect(Array.isArray(result.logic_anchors)).toBe(true);
      for (const anchor of result.logic_anchors as Array<{
        anchor_text: string;
        page_hint: number;
        chacha_comment: string;
      }>) {
        expect(typeof anchor.anchor_text).toBe("string");
        expect(typeof anchor.page_hint).toBe("number");
        expect(typeof anchor.chacha_comment).toBe("string");
      }

      if (result.suggested_glossary) {
        expect(Array.isArray(result.suggested_glossary)).toBe(true);
      }
    },
    60000
  );
});
