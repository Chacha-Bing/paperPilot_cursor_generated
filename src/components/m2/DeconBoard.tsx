/**
 * DeconBoard - 解构看板
 *
 * 展示论文四支柱（Motivation/Method/Result/Gap），从 IndexedDB 读取 paper.deconstruction。
 */
"use client";

import { useEffect, useState } from "react";

import { db } from "@/lib/db";

type TabKey = "motivation" | "method" | "result" | "gap";

const TABS: { key: TabKey; label: string }[] = [
  { key: "motivation", label: "研究动机" },
  { key: "method", label: "核心算法" },
  { key: "result", label: "实验结果" },
  { key: "gap", label: "不足之处" }
];

interface DeconBoardProps {
  paperId: string;
  onScrollToPage?: (page: number) => void;
}

export function DeconBoard(props: DeconBoardProps) {
  const { paperId, onScrollToPage } = props;
  const [tab, setTab] = useState<TabKey>("motivation");
  const [decon, setDecon] = useState<{
    motivation: string;
    method: string;
    result: string;
    gap: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    db.papers.get(paperId).then((paper) => {
      if (!cancelled && paper?.deconstruction) {
        setDecon(paper.deconstruction);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [paperId]);

  const content = decon?.[tab] ?? "茶茶正在准备解构内容…";
  const pageHints: Record<TabKey, number> = {
    motivation: 1,
    method: 2,
    result: 4,
    gap: 5
  };

  return (
    <div className="flex flex-col border-b border-navy-800">
      <div className="flex gap-1 border-b border-navy-800 p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              onScrollToPage?.(pageHints[t.key]);
            }}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors",
              tab === t.key
                ? "bg-navy-700 text-navy-400"
                : "text-slate-400 hover:bg-navy-800 hover:text-slate-200"
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-36 overflow-y-auto p-4 text-xs leading-relaxed text-slate-300">
        {content}
      </div>
    </div>
  );
}
