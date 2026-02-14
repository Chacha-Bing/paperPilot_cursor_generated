/**
 * PdfPageLayers - 单页三层渲染：Canvas | TextLayer | 术语高亮 | 波浪线（TDD 规约）
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { PdfService } from "@/services/pdf.service";
import { TermHighlights } from "@/components/m2/PdfVirtualViewer/TermHighlights";
import { WaveLines } from "@/components/m2/PdfVirtualViewer/WaveLines";

const pdfService = new PdfService();

interface PdfPageLayersProps {
  doc: Awaited<ReturnType<PdfService["loadFromArrayBuffer"]>>["doc"];
  paperId: string;
  pageNumber: number;
  pageHeight: number;
  pageWidth: number;
  scale: number;
  pageAnchors: Array<{ anchorText: string; chachaComment: string }>;
  glossaryTerms: string[];
}

export function PdfPageLayers(props: PdfPageLayersProps) {
  const { doc, paperId, pageNumber, pageHeight, pageWidth, scale, pageAnchors, glossaryTerms } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [textRendered, setTextRendered] = useState(false);
  const [anchorRects, setAnchorRects] = useState<Array<{ anchorText: string; chachaComment: string; rect: { x: number; y: number; width: number; height: number } }>>([]);
  const [termRects, setTermRects] = useState<Array<{ term: string; rect: { x: number; y: number; width: number; height: number } }>>([]);

  useEffect(() => {
    let cancelled = false;
    let renderCancel: (() => void) | null = null;
    const run = async () => {
      if (!canvasRef.current || !textRef.current) return;
      const { promise, cancel } = pdfService.renderPageToCanvas(
        doc,
        pageNumber,
        canvasRef.current,
        scale
      );
      renderCancel = cancel;
      await promise;
      if (cancelled) return;
      await pdfService.renderTextLayer(
        doc,
        pageNumber,
        textRef.current,
        scale
      );
      if (!cancelled) setTextRendered(true);
    };
    void run();
    return () => {
      cancelled = true;
      renderCancel?.();
    };
  }, [doc, pageNumber, scale]);

  useEffect(() => {
    if (pageAnchors.length === 0) {
      setAnchorRects([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const rects: Array<{ anchorText: string; chachaComment: string; rect: { x: number; y: number; width: number; height: number } }> = [];
      for (let i = 0; i < pageAnchors.length; i++) {
        if (cancelled) return;
        const a = pageAnchors[i];
        if (!a) continue;
        const found = await pdfService.findTextRects(doc, pageNumber, a.anchorText, scale);
        if (found?.[0]) {
          rects.push({ ...a, rect: found[0] });
        } else {
          rects.push({
            ...a,
            rect: { x: 24, y: 24 + i * 60, width: pageWidth - 48, height: 16 }
          });
        }
      }
      if (!cancelled) setAnchorRects(rects);
    };
    void run();
    return () => { cancelled = true; };
  }, [doc, pageNumber, scale, pageAnchors, pageWidth]);

  const [termGlossaryMap, setTermGlossaryMap] = useState<Record<string, { explanation: string; sourcePaperId: string }>>({});

  useEffect(() => {
    if (glossaryTerms.length === 0 || !doc) {
      setTermRects([]);
      return;
    }
    let cancelled = false;
    pdfService.findTermRects(doc, pageNumber, glossaryTerms, scale).then((rects) => {
      if (!cancelled) setTermRects(rects);
    });
    return () => { cancelled = true; };
  }, [doc, pageNumber, scale, glossaryTerms]);

  useEffect(() => {
    if (termRects.length === 0) return;
    const words = [...new Set(termRects.map((t) => t.term))];
    let cancelled = false;
    Promise.all(words.map((w) => db.glossary.where("word").equals(w).first())).then((rows) => {
      if (cancelled) return;
      const map: Record<string, { explanation: string; sourcePaperId: string }> = {};
      words.forEach((w, i) => {
        const r = rows[i];
        if (r) map[w] = { explanation: r.explanation, sourcePaperId: r.sourcePaperId };
      });
      setTermGlossaryMap(map);
    });
    return () => { cancelled = true; };
  }, [termRects]);

  return (
    <div
      className="relative overflow-hidden rounded bg-white shadow-lg"
      style={{
        width: pageWidth,
        height: pageHeight,
        "--total-scale-factor": scale,
        "--scale-round-x": "0.01px",
        "--scale-round-y": "0.01px"
      } as React.CSSProperties}
    >
      <div
        className="absolute left-0 top-0"
        style={{ zIndex: 1, pointerEvents: "none", width: pageWidth, height: pageHeight }}
      >
        <canvas ref={canvasRef} className="block" style={{ width: pageWidth, height: pageHeight }} />
      </div>
      <div
        ref={textRef}
        className="textLayer absolute left-0 top-0 select-text bg-transparent text-transparent"
        style={{ zIndex: 2, pointerEvents: "auto", userSelect: "text", width: pageWidth, height: pageHeight }}
      />
      {textRendered && termRects.length > 0 && (
        <TermHighlights
          paperId={paperId}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          termRects={termRects}
          termGlossaryMap={termGlossaryMap}
        />
      )}
      {textRendered && anchorRects.length > 0 && (
        <WaveLines
          paperId={paperId}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
          anchorRects={anchorRects}
        />
      )}
    </div>
  );
}
