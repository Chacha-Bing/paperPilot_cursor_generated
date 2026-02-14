/**
 * ChatPanel - 茶茶对话面板
 *
 * 支持 Markdown、LaTeX(KaTeX)、[[page,line]] 引用跳转、reasoning_content 折叠展示。
 * 与 /api/chat 流式对接，使用 chatStore 管理消息与流式状态。
 */
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";
import { db } from "@/lib/db";
import { DBService } from "@/services/db.service";
import { PdfService } from "@/services/pdf.service";
import { useChatStore } from "@/store/chatStore";
import { usePaperStore } from "@/store/paperStore";
import { rehypeCitation } from "@/lib/rehype-citation";

function CitationLink(props: { page: number; line: number }) {
  const scrollToCitation = usePaperStore((s) => s.scrollToCitation);
  return (
    <button
      type="button"
      onClick={() => scrollToCitation(props.page, props.line)}
      className="mx-0.5 inline-flex items-center gap-0.5 rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] text-blue-100 hover:bg-blue-500/90"
    >
      <span aria-hidden>📄</span>
      第 {props.page} 页第 {props.line} 行
    </button>
  );
}

const dbService = new DBService();
const pdfService = new PdfService();

const GLOBAL_PROMPT = `Role: 你是 PaperPilot 的首席助学学长「茶茶」。你正在陪伴一名大一科研萌新阅读学术论文。
CoreMission: 实践苏格拉底式教学法。你的目标不是"告知答案"，而是"点燃思维"。你通过提问、类比和反向推导，引导用户自己推导出论文的逻辑。
Personality: 亲切、温和，偶尔用可爱的表情（如🌱,✨,🧠）。像真正的学长一样分享共情话语。专业但不术语堆砌，擅长将复杂公式类比为生活常识。
在回复中引用 PDF 时，请使用格式 [[页码, 行号]]，例如 [[3, 12]]。`;

const HISTORY_LIMIT = 10;

interface ChatPanelProps {
  paperId: string;
}

export function ChatPanel(props: ChatPanelProps) {
  const { paperId } = props;
  const {
    messages,
    addMessage,
    setMessages,
    isThinking,
    setIsThinking,
    resetReasoning,
    appendReasoning,
    reasoningContent,
    streamingContent,
    appendStreamingContent,
    clearStreamingContent,
    selectionContext,
    pendingPrompt,
    setPendingPrompt
  } = useChatStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const records = await dbService.getMessages(paperId);
      if (cancelled) return;
      const msgs = records.map((r) =>
        r.role === "assistant"
          ? { role: "assistant" as const, content: r.content, ...(r.reasoning ? { reasoning: r.reasoning } : {}) }
          : { role: "user" as const, content: r.content }
      );
      setMessages(msgs);
    })();
    return () => { cancelled = true; };
  }, [paperId, setMessages]);

  const sendToApi = async (
    userContent: string,
    selCtx?: string | null
  ) => {
    resetReasoning();
    clearStreamingContent();
    setIsThinking(true);

    try {
      const paper = await db.papers.get(paperId);
      if (!paper) throw new Error("论文不存在");

      const currentPage = usePaperStore.getState().currentPage;
      let activeContext = "";
      try {
        const { doc } = await pdfService.loadFromArrayBuffer(paper.fileData);
        const pageNum = Math.max(1, Math.min(currentPage, doc.numPages));
        const pageResult = await pdfService.getPageText(doc, pageNum);
        activeContext = `用户正在阅读第 ${pageResult.pageNumber} 页，当前页面的核心内容如下：\n${pageResult.text}`;
      } catch {
        activeContext = "（无法获取当前页文本）";
      }

      const currentSelection = selCtx ?? selectionContext ?? "";

      const systemMessages: Array<{ role: "system"; content: string }> = [
        { role: "system", content: GLOBAL_PROMPT },
        { role: "system", content: `当前论文解构：\n${JSON.stringify(paper.deconstruction ?? {}, null, 2)}` },
        { role: "system", content: `视口上下文：${activeContext}` }
      ];
      if (currentSelection) {
        systemMessages.push({ role: "system", content: `当前划词：${currentSelection}` });
      }

      const history = await dbService.getMessages(paperId, HISTORY_LIMIT);
      const historyMessages = history.map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content
      }));
      const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        ...systemMessages,
        ...historyMessages,
        { role: "user" as const, content: userContent }
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: fullMessages })
      });

      if (!response.body) {
        setIsThinking(false);
        return;
      }

      await dbService.addMessage({
        paperId,
        role: "user",
        content: userContent,
        timestamp: Date.now(),
        isMemorySynced: false
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantContent = "";
      let fullReasoning = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line) as { content?: string; reasoning?: string };
            if (data.reasoning) {
              fullReasoning += data.reasoning;
              appendReasoning(data.reasoning);
            }
            if (data.content) {
              assistantContent += data.content;
              appendStreamingContent(data.content);
            }
          } catch {
            // ignore malformed line
          }
        }
      }

      if (assistantContent) {
        addMessage({
          role: "assistant",
          content: assistantContent,
          ...(fullReasoning ? { reasoning: fullReasoning } : {})
        });
        await dbService.addMessage({
          paperId,
          role: "assistant",
          content: assistantContent,
          reasoning: fullReasoning || undefined,
          timestamp: Date.now(),
          isMemorySynced: false
        });
      }
      resetReasoning();
      clearStreamingContent();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (!pendingPrompt) return;
    const prompt = pendingPrompt.prompt;
    const selCtx = pendingPrompt.selectionContext;
    setPendingPrompt(null);
    addMessage({ role: "user", content: prompt });
    sendToApi(prompt, selCtx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    addMessage({ role: "user", content: trimmed });
    setInput("");
    sendToApi(trimmed);
  };

  const displayContent = isThinking && streamingContent ? streamingContent : null;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 text-xs text-slate-200 prose prose-invert prose-sm max-w-none"
      >
        {messages.map((message, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={[
              "max-w-full rounded-lg px-3 py-2",
              message.role === "user"
                ? "ml-auto bg-slate-100 text-slate-900 prose-p:text-slate-900"
                : "mr-auto bg-slate-800 text-slate-50 prose-p:text-slate-50"
            ].join(" ")}
          >
            {message.role === "assistant" ? (
              <>
                {message.reasoning ? (
                  <details className="mb-2 rounded bg-slate-900/60 p-2 text-[11px] text-slate-400">
                    <summary className="cursor-pointer">学长心路历程</summary>
                    <p className="mt-2 whitespace-pre-wrap">{message.reasoning}</p>
                  </details>
                ) : null}
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeCitation, rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    a: ({ href, children }) => {
                      const m = href?.match(/^#cite-(\d+)-(\d+)$/);
                      if (m?.[1] && m?.[2]) {
                        return (
                          <CitationLink page={parseInt(m[1], 10)} line={parseInt(m[2], 10)} />
                        );
                      }
                      return <a href={href}>{children}</a>;
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </>
            ) : (
              message.content
            )}
          </div>
        ))}
        {isThinking ? (
          <div className="rounded-lg bg-slate-800 px-3 py-2">
            {reasoningContent ? (
              <details open className="text-[11px] text-slate-400">
                <summary className="cursor-pointer">学长正在推导…</summary>
                <p className="mt-2 whitespace-pre-wrap">{reasoningContent}</p>
              </details>
            ) : null}
            {displayContent ? (
              <div className="mt-2">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeCitation, rehypeKatex]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    a: ({ href, children }) => {
                      const m = href?.match(/^#cite-(\d+)-(\d+)$/);
                      if (m?.[1] && m?.[2]) {
                        return (
                          <CitationLink page={parseInt(m[1], 10)} line={parseInt(m[2], 10)} />
                        );
                      }
                      return <a href={href}>{children}</a>;
                    }
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            ) : (
              !reasoningContent && <p className="text-[11px] text-slate-400">茶茶正在思考中…</p>
            )}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-slate-800 bg-slate-950/95 px-3 py-2 text-xs backdrop-blur-sm"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="问茶茶一个关于当前论文的问题吧…"
            className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-chacha-amber"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="h-8 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
