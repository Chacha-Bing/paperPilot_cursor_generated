/**
 * WorkflowSidebar - 工作流侧边栏
 *
 * 展示当前论文、历史记录、新增论文入口。
 * 点击历史记录会调用 onSelectPaper(id, title)，由父组件负责路由跳转。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import type { PaperRecord } from "@/lib/db";
import { usePaperStore } from "@/store/paperStore";

interface WorkflowSidebarProps {
  currentPaperId: string | null;
  currentFileName: string | null;
  scrollProgress: number;
  onSelectPaper: (paperId: string, title: string) => void;
  /** 是否显示「新增论文」按钮（上传页与阅读页均显示） */
  showAddNew?: boolean;
}

export function WorkflowSidebar(props: WorkflowSidebarProps) {
  const { currentPaperId, currentFileName, scrollProgress, onSelectPaper, showAddNew = true } = props;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const setCurrentPaperId = usePaperStore((s) => s.setCurrentPaperId);

  const handleAddNew = useCallback(() => {
    router.push("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await db.papers.orderBy("lastReadTime").reverse().toArray();
      if (!cancelled) setPapers(list);
    };
    void load();
    return () => { cancelled = true; };
  }, [currentPaperId]);

  const handleSelect = useCallback(
    (paper: PaperRecord) => {
      setCurrentPaperId(paper.id);
      onSelectPaper(paper.id, paper.title);
      setExpanded(false);
    },
    [onSelectPaper, setCurrentPaperId]
  );

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("确定删除这篇论文？")) return;
    await db.papers.delete(id);
    await db.anchors.where("paperId").equals(id).delete();
    await db.messages.where("paperId").equals(id).delete();
    const remaining = papers.filter((p) => p.id !== id);
    setPapers(remaining);
    if (currentPaperId === id) {
      const next = remaining[0];
      if (next) {
        handleSelect(next);
      } else {
        router.push("/");
      }
    }
  }, [currentPaperId, papers, handleSelect, router]);

  return (
    <div
      className={`flex shrink-0 flex-col border-r border-navy-800 bg-navy-950 transition-all duration-200 ${
        expanded ? "w-64" : "w-12"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-navy-800 px-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-800/80 text-slate-300 transition-colors hover:bg-navy-700 hover:text-white"
          aria-label={expanded ? "收起大纲" : "展开大纲"}
        >
          <svg
            className={`h-5 w-5 transition-transform ${expanded ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {expanded && (
          <span className="ml-2 text-xs font-medium text-slate-300">工作流</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {expanded ? (
          <>
            {showAddNew && (
              <div className="px-3 py-2">
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-navy-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新增论文
                </button>
              </div>
            )}
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">当前论文</p>
              {currentPaperId && currentFileName ? (
                <div className="mt-1 rounded-lg border border-navy-800 bg-navy-800/60 p-2">
                  <p className="truncate text-xs text-slate-100">{currentFileName}</p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-navy-800">
                    <div
                      className="h-full rounded-full bg-navy-500 transition-all"
                      style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {Math.round(scrollProgress * 100)}% 已读
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">暂无</p>
              )}
            </div>

            <div className="mt-2 px-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">历史记录</p>
              <ul className="mt-1 space-y-0.5">
                {papers.map((p) => (
                  <li key={p.id}>
                    <div
                      className={`group flex w-full items-center gap-1 rounded-lg border px-2.5 py-2 transition-colors ${
                        p.id === currentPaperId
                          ? "border-navy-600 bg-navy-700"
                          : "border-navy-800 bg-navy-800 hover:border-navy-700 hover:bg-navy-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        style={{ color: "white", backgroundColor: "#1a365dcc", fontWeight: "normal" }}
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold transition-colors"
                      >
                        {p.title}
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {p.status === "archived" && (
                          <span className="text-[10px] text-emerald-400">✓</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, p.id)}
                          className="rounded p-1 text-slate-400 opacity-70 transition-all hover:bg-rose-500/30 hover:text-rose-400 hover:opacity-100"
                          aria-label="删除"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {papers.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">暂无历史</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] text-slate-500">悬停展开</span>
          </div>
        )}
      </div>
    </div>
  );
}
