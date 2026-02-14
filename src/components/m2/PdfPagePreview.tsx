"use client";

import { useEffect, useRef, useState } from "react";

import { PdfThreeLayerShell } from "@/components/m2/PdfThreeLayerShell";
import { db } from "@/lib/db";
import { PdfService } from "@/services/pdf.service";

const pdfService = new PdfService();

interface PdfPagePreviewProps {
  paperId: string;
}

/**
 * 使用 pdf.js 将 Dexie 中存储的 PDF 第一页渲染到 CanvasLayer 中。
 * 当前为单页预览示意，后续会被虚拟列表替换。
 */
export function PdfPagePreview(props: PdfPagePreviewProps) {
  const { paperId } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderCancel: (() => void) | null = null;

    const run = async () => {
      try {
        const paper = await db.papers.get(paperId);
        if (!paper || cancelled) return;

        const { doc } = await pdfService.loadFromArrayBuffer(paper.fileData);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const { promise, cancel } = pdfService.renderPageToCanvas(doc, 1, canvas, 1.2);
        renderCancel = cancel;
        await promise;
      } catch (err) {
        if (!cancelled) {
          setError("PDF 预览加载失败，请稍后重试。");
        }
        // eslint-disable-next-line no-console
        console.error(err);
      }
    };

    void run();

    return () => {
      cancelled = true;
      renderCancel?.();
    };
  }, [paperId]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-100">
        {error}
      </div>
    );
  }

  return (
    <PdfThreeLayerShell
      width={640}
      height={480}
      canvasLayer={<canvas ref={canvasRef} className="h-full w-full" />}
    />
  );
}

