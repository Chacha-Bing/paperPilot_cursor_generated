/**
 * WaveLines - 逻辑锚点波浪线（琥珀色）
 */
"use client";

import { useChatStore } from "@/store/chatStore";

interface WaveLinesProps {
  paperId: string;
  pageHeight: number;
  pageWidth: number;
  anchorRects: Array<{
    anchorText: string;
    chachaComment: string;
    rect: { x: number; y: number; width: number; height: number };
  }>;
}

export function WaveLines(props: WaveLinesProps) {
  const { paperId, pageWidth, pageHeight, anchorRects } = props;
  const injectChachaHint = useChatStore((s) => s.injectChachaHint);

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 3 }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="none"
    >
      {anchorRects.map((a, i) => {
        const { x, y, width, height } = a.rect;
        const waveY = y + height + 4;
        const xStep = Math.max(20, width / 4);
        const pts: Array<{ x: number; y: number }> = [];
        for (let j = 0; j <= 4; j++) {
          pts.push({
            x: x + xStep * j,
            y: waveY + (j % 2 === 0 ? 0 : 6)
          });
        }
        const d = pts.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
        return (
          <g
            key={i}
            className="pointer-events-auto cursor-pointer"
            onClick={() => injectChachaHint(a.chachaComment, paperId)}
          >
            <path
              d={d}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}
