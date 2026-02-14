/**
 * ReadingState - 阅读中双栏布局（PDF + 解构看板 + 对话）
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { PdfVirtualViewer } from "@/components/m2/PdfVirtualViewer";
import { DeconBoard } from "@/components/m2/DeconBoard";
import { ChatPanel } from "@/components/m2/ChatPanel";
import { SelectionToolbar } from "@/components/m2/SelectionToolbar";
import { WorkflowSidebar } from "@/components/m2/WorkflowSidebar";
import { db } from "@/lib/db";
import { usePaperStore } from "@/store/paperStore";

const MIN_PDF_WIDTH = 280;
const MIN_ASIDE_WIDTH = 320;
const DEFAULT_PDF_RATIO = 0.5;

interface ReadingStateProps {
  fileName: string;
  paperId: string;
  onSwitchPaper?: (paperId: string, title: string) => void;
}

export function ReadingState(props: ReadingStateProps) {
  const { fileName, paperId, onSwitchPaper } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdfRatio, setPdfRatio] = useState(DEFAULT_PDF_RATIO);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [summaryBubbleShown, setSummaryBubbleShown] = useState(false);
  const [summaryBubbleDismissed, setSummaryBubbleDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const citationTarget = usePaperStore((s) => s.citationTarget);
  const clearCitationTarget = usePaperStore((s) => s.clearCitationTarget);

  const handleScrollProgress = useCallback((progress: number) => {
    setScrollProgress(progress);
    if (progress >= 0.85 && !summaryBubbleDismissed) setSummaryBubbleShown(true);
  }, [summaryBubbleDismissed]);

  const handleScrollToPage = useCallback((page: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const pageEl = el.querySelector(`[data-page="${page}"]`);
    pageEl?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const t2Ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!citationTarget) return;
    handleScrollToPage(citationTarget.page);
    const el = scrollRef.current;
    const page = citationTarget.page;
    const t1 = setTimeout(() => {
      const pageEl = el?.querySelector(`[data-page="${page}"]`) as HTMLElement | null;
      if (pageEl) {
        pageEl.classList.add("citation-highlight");
        t2Ref.current = setTimeout(() => {
          pageEl.classList.remove("citation-highlight");
          clearCitationTarget();
        }, 2000);
      } else {
        clearCitationTarget();
      }
    }, 400);
    return () => {
      clearTimeout(t1);
      if (t2Ref.current) clearTimeout(t2Ref.current);
    };
  }, [citationTarget, handleScrollToPage, clearCitationTarget]);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(MIN_PDF_WIDTH / rect.width, Math.min(1 - MIN_ASIDE_WIDTH / rect.width, x / rect.width));
      setPdfRatio(ratio);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  return (
    <section className="flex min-h-0 flex-1 overflow-hidden">
      {onSwitchPaper && (
        <WorkflowSidebar
          currentPaperId={paperId}
          currentFileName={fileName}
          scrollProgress={scrollProgress}
          onSelectPaper={onSwitchPaper}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SelectionToolbar paperId={paperId} />
        <div ref={containerRef} className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            className="flex min-h-0 flex-col min-w-0 border-r border-navy-800 bg-navy-950 p-4"
            style={{ flex: `${pdfRatio} 1 0`, minWidth: MIN_PDF_WIDTH }}
          >
            <div className="mb-2 shrink-0 flex items-center justify-between text-xs text-slate-400">
              <p className="truncate">
                当前论文：<span className="text-slate-100">{fileName}</span>
              </p>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-navy-800">
              <PdfVirtualViewer
                paperId={paperId}
                scrollContainerRef={scrollRef}
                onScrollProgress={handleScrollProgress}
              />
              {summaryBubbleShown && (
                <SummaryBubble
                  fileName={fileName}
                  paperId={paperId}
                  onDismiss={() => {
                    setSummaryBubbleDismissed(true);
                    setSummaryBubbleShown(false);
                  }}
                />
              )}
            </div>
          </div>

          <div
            className="hidden md:flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-navy-800 hover:bg-navy-700 transition-colors"
            onMouseDown={handleSplitterMouseDown}
            role="separator"
            aria-label="拖拽调节左右栏宽度"
          >
            <div className="h-8 w-0.5 rounded-full bg-navy-700" />
          </div>

          <aside
            className="flex flex-col border-t border-navy-800 bg-navy-900 md:border-l md:border-t-0 min-h-0"
            style={{ flex: `${1 - pdfRatio} 1 0`, minWidth: MIN_ASIDE_WIDTH }}
          >
            <DeconBoard paperId={paperId} onScrollToPage={handleScrollToPage} />
            <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: 0 }}>
              <div className="shrink-0 border-b border-navy-800 px-4 py-2 text-xs">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  茶茶对话 · 实验室频道
                </p>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                <ChatPanel paperId={paperId} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SummaryBubble(props: {
  fileName: string;
  paperId: string;
  onDismiss: () => void;
}) {
  const { paperId, onDismiss } = props;
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.papers.update(paperId, { status: "archived" });
      onDismiss();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="absolute bottom-6 left-1/2 z-20 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-navy-700 bg-navy-900 p-5"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <p className="text-sm leading-relaxed text-slate-100">
        学弟，看样子这篇论文你已经拿下 85% 了，茶茶为你准备了简报，要看看吗？
      </p>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-navy-800 hover:text-slate-200"
        >
          稍后再说
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-navy-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-500 disabled:opacity-50"
        >
          {saving ? "存入中…" : "✨ 盖章存入存档"}
        </button>
      </div>
    </motion.div>
  );
}
