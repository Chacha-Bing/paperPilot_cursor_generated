/**
 * preparse.service - AI 预解析服务
 *
 * 流程：加载 PDF -> 提取文本 -> 调用 preparseAction(Server Action) -> 解析 AI 返回 -> 写入 IndexedDB
 *
 * 字段兼容：AI 可能返回 core_deconstruction/logical_anchors，
 * 代码统一期望 deconstruction/logic_anchors，此处做兼容处理。
 */
import { preparseAction } from "@/app/actions/preparse";
import { db, type PaperRecord } from "@/lib/db";
import { PdfService } from "@/services/pdf.service";
import { DBService } from "@/services/db.service";

const pdfService = new PdfService();
const dbService = new DBService();

export type ParsingStage =
  | "loading"
  | "extracting"
  | "ai_scan"
  | "ai_anchors"
  | "done";

export interface PreparseProgress {
  stage: ParsingStage;
  message: string;
}

/** 预解析进度消息 */
const STAGE_MESSAGES: Record<ParsingStage, string> = {
  loading: "茶茶正在帮你翻开书页…",
  extracting: "正在提取论文文本…",
  ai_scan: "茶茶正在概括论文大意…",
  ai_anchors: "茶茶正在寻找值得讨论的重点…",
  done: "解析完成"
};

/** 判断论文是否已完成预解析（四支柱均有内容，可跳过 AI 调用） */
function isPreparsed(paper: { deconstruction?: PaperRecord["deconstruction"] }): boolean {
  const d = paper.deconstruction;
  if (!d) return false;
  return Boolean(
    d.motivation?.trim() &&
    d.method?.trim() &&
    d.result?.trim() &&
    d.gap?.trim()
  );
}

export async function runPreparse(
  paperId: string,
  onProgress?: (p: PreparseProgress) => void
): Promise<void> {
  const paper = await db.papers.get(paperId);
  if (!paper) throw new Error("论文不存在");

  const report = (stage: ParsingStage) => {
    onProgress?.({ stage, message: STAGE_MESSAGES[stage] });
  };

  if (isPreparsed(paper)) {
    report("done");
    return;
  }

  report("loading");
  const { doc } = await pdfService.loadFromArrayBuffer(paper.fileData);

  report("extracting");
  const { fullText } = await pdfService.extractTextForPreparse(doc, 10);

  report("ai_scan");
  const raw = (await preparseAction(fullText, paper.title).catch((err) => {
    throw new Error(err instanceof Error ? err.message : "预解析失败");
  })) as unknown as Record<string, unknown>;
  const deconstruction =
    (raw.deconstruction as { motivation: string; method: string; result: string; gap: string }) ??
    (raw.core_deconstruction as { motivation: string; method: string; result: string; gap: string });
  const logicAnchors =
    (raw.logic_anchors as Array<{ anchor_text: string; page_hint: number; chacha_comment: string }>) ??
    (raw.logical_anchors as Array<{ anchor_text: string; page_hint: number; chacha_comment: string }>) ??
    [];
  const suggestedGlossary =
    (raw.suggested_glossary as Array<{ term: string; category?: string }>) ??
    (raw.knowledge_discovery as Array<{ term: string; definition?: string }>) ??
    [];

  if (!deconstruction?.motivation && !deconstruction?.method && !deconstruction?.result && !deconstruction?.gap) {
    throw new Error("AI 返回的解构数据格式异常，请重试。");
  }

  report("ai_anchors");

  await dbService.updatePaperDeconstruction(paperId, {
    motivation: deconstruction.motivation ?? "",
    method: deconstruction.method ?? "",
    result: deconstruction.result ?? "",
    gap: deconstruction.gap ?? ""
  });

  const anchors = logicAnchors.map((a, i) => ({
    id: `${paperId}-anchor-${i}`,
    paperId,
    pageHint: a.page_hint,
    anchorText: a.anchor_text,
    chachaComment: a.chacha_comment
  }));
  await dbService.saveAnchors(paperId, anchors);

  /** 预解析建议术语：自动录入术语表（TDD：术语发现） */
  const now = Date.now();
  for (const item of suggestedGlossary) {
    const raw = item as Record<string, unknown>;
    const term = (raw.term ?? raw.word) as string | undefined;
    const explanation = (raw.definition ?? raw.explanation ?? "（预解析建议，阅读时可划词让茶茶补全）") as string;
    if (term?.trim()) {
      await db.glossary.put({
        word: String(term).trim(),
        explanation: String(explanation).trim() || "（预解析建议，阅读时可划词让茶茶补全）",
        sourcePaperId: paperId,
        addedTime: now,
        masteryLevel: 0
      });
    }
  }

  report("done");
}
