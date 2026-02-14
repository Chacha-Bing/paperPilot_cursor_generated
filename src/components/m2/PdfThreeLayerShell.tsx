import type { CSSProperties, ReactNode } from "react";

export interface PdfThreeLayerShellProps {
  width: number;
  height: number;
  canvasLayer?: ReactNode;
  textLayer?: ReactNode;
  interactionLayer?: ReactNode;
}

/**
 * PDF 三层夹心容器骨架：
 * - Bottom: CanvasLayer (z-1)
 * - Middle: TextLayer  (z-2)
 * - Top: InteractionLayer (z-3, pointer-events: none; 未来特定元素开启 auto)
 */
export function PdfThreeLayerShell(props: PdfThreeLayerShellProps) {
  const { width, height, canvasLayer, textLayer, interactionLayer } = props;

  const baseStyle: CSSProperties = {
    position: "absolute",
    inset: 0
  };

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-slate-900"
      style={{ width, height }}
    >
      {/* CanvasLayer */}
      <div
        style={{ ...baseStyle, zIndex: 1 }}
        aria-hidden="true"
        data-layer="canvas"
      >
        {canvasLayer}
      </div>

      {/* TextLayer */}
      <div
        style={{ ...baseStyle, zIndex: 2 }}
        data-layer="text"
        className="pointer-events-auto select-text bg-transparent text-transparent"
      >
        {textLayer}
      </div>

      {/* InteractionLayer */}
      <div
        style={{ ...baseStyle, zIndex: 3, pointerEvents: "none" }}
        data-layer="interaction"
      >
        {interactionLayer}
      </div>
    </div>
  );
}

