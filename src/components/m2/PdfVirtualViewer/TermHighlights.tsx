/**
 * TermHighlights - 术语高亮（淡青色虚线 + Hover 弹窗）
 */
"use client";

import { useState } from "react";
import { usePaperStore } from "@/store/paperStore";

interface TermHighlightsProps {
  paperId: string;
  pageWidth: number;
  pageHeight: number;
  termRects: Array<{ term: string; rect: { x: number; y: number; width: number; height: number } }>;
  termGlossaryMap: Record<string, { explanation: string; sourcePaperId: string }>;
}

export function TermHighlights(props: TermHighlightsProps) {
  const { paperId, pageWidth, pageHeight, termRects, termGlossaryMap } = props;
  const [hovered, setHovered] = useState<{ term: string; rect: DOMRect } | null>(null);
  const reqJump = usePaperStore((s) => s.requestJumpToPaper);

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 3, pointerEvents: "none" }}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        preserveAspectRatio="none"
      >
        {termRects.map(({ term, rect }, i) => {
          const y = rect.y + rect.height + 1;
          return (
            <line
              key={`${term}-${i}`}
              x1={rect.x}
              y1={y}
              x2={rect.x + rect.width}
              y2={y}
              stroke="#0D9488"
              strokeWidth="1"
              strokeDasharray="3 2"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 3, pointerEvents: "none" }}
        viewBox={`0 0 ${pageWidth} ${pageHeight}`}
        preserveAspectRatio="none"
      >
        {termRects.map(({ term, rect }, i) => {
          const info = termGlossaryMap[term];
          return (
            <g key={`hit-${term}-${i}`} style={{ pointerEvents: "auto" }}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height + 4}
                fill="transparent"
                className="cursor-help"
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHovered({ term, rect: r });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>
      {hovered && (() => {
        const info = termGlossaryMap[hovered.term];
        if (!info) return null;
        const { rect } = hovered;
        return (
          <div
            className="fixed z-[60] max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl"
            style={{
              left: rect.left + rect.width / 2,
              top: rect.top - 8,
              transform: "translate(-50%, -100%)"
            }}
          >
            <p className="font-medium text-chacha-teal">{hovered.term}</p>
            <p className="mt-1 text-slate-300">{info.explanation || "（待茶茶生成）"}</p>
            {info.sourcePaperId !== paperId && (
              <button
                type="button"
                onClick={() => reqJump(info.sourcePaperId)}
                className="mt-2 text-[11px] text-chacha-amber hover:underline"
              >
                跳转到来源论文 →
              </button>
            )}
          </div>
        );
      })()}
    </>
  );
}
