/**
 * PdfVirtualViewer - PDF 虚拟列表渲染
 *
 * 三层结构：CanvasLayer(z:1) | TextLayer(z:2) | InteractionLayer(z:3)。
 * 仅渲染视口内及缓冲页，离开视口销毁 Canvas 释放内存。
 * 术语高亮由 AC 自动机在 Worker 中匹配。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { db } from "@/lib/db";
import { PdfService } from "@/services/pdf.service";
import { usePaperStore } from "@/store/paperStore";
import { PdfPageLayers } from "@/components/m2/PdfVirtualViewer/PdfPageLayers";

const pdfService = new PdfService();
const SCALE = 1.2;
const BUFFER_PAGES = 1;
const PAGE_ASPECT = 612 / 792;

interface PdfVirtualViewerProps {
  paperId: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onSelectionChange?: (text: string, rect: DOMRect) => void;
  onScrollProgress?: (progress: number) => void;
}

export function PdfVirtualViewer(props: PdfVirtualViewerProps) {
  const { paperId, scrollContainerRef, onSelectionChange, onScrollProgress } = props;
  const scrollRef = useRef<HTMLDivElement>(null);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      if (scrollContainerRef) (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [scrollContainerRef]
  );
  const [pageHeights, setPageHeights] = useState<number[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [doc, setDoc] = useState<Awaited<ReturnType<PdfService["loadFromArrayBuffer"]>>["doc"] | null>(null);
  const [anchors, setAnchors] = useState<Array<{ pageHint: number; anchorText: string; chachaComment: string }>>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<string[]>([]);
  const [visibleRange, setVisibleRange] = useState({ start: 1, end: 1 });
  const setCurrentPage = usePaperStore((s) => s.setCurrentPage);
  const glossaryVersion = usePaperStore((s) => s.glossaryVersion);

  useEffect(() => {
    let cancelled = false;
    db.glossary.toArray().then((rows) => {
      if (!cancelled) setGlossaryTerms([...new Set(rows.map((r) => r.word.trim()).filter(Boolean))]);
    });
    return () => { cancelled = true; };
  }, [glossaryVersion]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const paper = await db.papers.get(paperId);
      if (!paper || cancelled) return;
      const { doc: d } = await pdfService.loadFromArrayBuffer(paper.fileData);
      if (cancelled) return;
      setDoc(d);
      setTotalPages(d.numPages);
      const heights: number[] = [];
      for (let i = 1; i <= d.numPages; i++) {
        const page = await d.getPage(i);
        const vp = page.getViewport({ scale: SCALE });
        heights.push(vp.height);
      }
      setPageHeights(heights);

      const anchorList = await db.anchors.where("paperId").equals(paperId).toArray();
      setAnchors(
        anchorList.map((a) => ({
          pageHint: a.pageHint,
          anchorText: a.anchorText,
          chachaComment: a.chachaComment
        }))
      );
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [paperId]);

  const totalHeight = pageHeights.reduce((a, b) => a + b, 0) + (pageHeights.length - 1) * 16;

  const updateVisibleRange = useCallback(() => {
    const el = scrollRef.current;
    if (!el || pageHeights.length === 0) return;
    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    const buffer = BUFFER_PAGES * 400;
    const visibleTop = scrollTop - buffer;
    const visibleBottom = scrollTop + clientHeight + buffer;
    let acc = 0;
    let start = pageHeights.length + 1;
    let end = 1;
    for (let i = 0; i < pageHeights.length; i++) {
      const h = (pageHeights[i] ?? 0) + 16;
      const pageTop = acc;
      const pageBottom = acc + h;
      const inRange = pageBottom > visibleTop && pageTop < visibleBottom;
      if (inRange) {
        start = Math.min(start, i + 1);
        end = Math.max(end, i + 1);
      }
      acc += h;
    }
    if (start > pageHeights.length) start = 1;
    setVisibleRange((prev) =>
      prev.start !== start || prev.end !== end ? { start, end } : prev
    );
    const progress = totalHeight > 0 ? Math.min(1, scrollTop / Math.max(1, totalHeight - clientHeight)) : 0;
    onScrollProgress?.(progress);
    setCurrentPage(start);
  }, [pageHeights, totalHeight, totalPages, onScrollProgress, setCurrentPage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      () => updateVisibleRange(),
      { root: el, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    el.addEventListener("scroll", updateVisibleRange);
    updateVisibleRange();
    return () => {
      el.removeEventListener("scroll", updateVisibleRange);
      observer.disconnect();
    };
  }, [updateVisibleRange]);

  const setSelectionToolbar = usePaperStore((s) => s.setSelectionToolbar);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[PaperPilot 划词调试] selection:", {
        text: text.slice(0, 200) + (text.length > 200 ? "…" : ""),
        length: text.length,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      });
    }
    setSelectionToolbar({ x: rect.left, y: rect.top, text });
    onSelectionChange?.(text, rect);
  }, [onSelectionChange, setSelectionToolbar]);

  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (text && process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[PaperPilot 划词调试] 滑动选择中:", text.slice(0, 100) + (text.length > 100 ? "…" : ""));
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  if (!doc || pageHeights.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        加载中…
      </div>
    );
  }

  let offsetTop = 0;
  const pageWidth = pageHeights.length > 0 ? (pageHeights[0] ?? 0) * PAGE_ASPECT : 0;
  const pages: Array<{ num: number; top: number; height: number; width: number }> = [];
  for (let i = 0; i < pageHeights.length; i++) {
    const ph = pageHeights[i] ?? 0;
    const pw = ph * PAGE_ASPECT;
    pages.push({ num: i + 1, top: offsetTop, height: ph, width: pw });
    offsetTop += ph + 16;
  }

  return (
    <div
      ref={setRef}
      className="h-full overflow-y-auto bg-slate-900"
      onMouseUp={handleMouseUp}
    >
      <div style={{ height: totalHeight, position: "relative", minWidth: pageWidth }}>
        {pages.map((p) => {
          const visible =
            p.num >= visibleRange.start && p.num <= visibleRange.end;
          return (
            <div
              key={p.num}
              data-page={p.num}
              style={{
                position: "absolute",
                left: 0,
                top: p.top,
                width: p.width,
                height: p.height
              }}
            >
              {visible ? (
                <PdfPageLayers
                  doc={doc}
                  paperId={paperId}
                  pageNumber={p.num}
                  pageHeight={p.height}
                  pageWidth={p.width}
                  scale={SCALE}
                  pageAnchors={anchors.filter((a) => a.pageHint === p.num)}
                  glossaryTerms={glossaryTerms}
                />
              ) : (
                <div
                  style={{
                    width: p.width,
                    height: p.height,
                    background: "rgb(30 41 59)",
                    borderRadius: 4
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
