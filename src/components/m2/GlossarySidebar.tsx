/**
 * GlossarySidebar - 术语表侧边栏
 *
 * 从 IndexedDB glossary 表读取，支持搜索、跳转到来源论文。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import type { GlossaryRecord } from "@/lib/db";
import { usePaperStore } from "@/store/paperStore";

interface GlossarySidebarProps {
  open: boolean;
  onClose: () => void;
}

export function GlossarySidebar(props: GlossarySidebarProps) {
  const { open, onClose } = props;
  const [terms, setTerms] = useState<GlossaryRecord[]>([]);
  const [search, setSearch] = useState("");
  const requestJumpToPaper = usePaperStore((s) => s.requestJumpToPaper);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    db.glossary.orderBy("addedTime").reverse().toArray().then((rows) => {
      if (!cancelled) setTerms(rows);
    });
    return () => { cancelled = true; };
  }, [open]);

  const filtered = search.trim()
    ? terms.filter((t) =>
        t.word.toLowerCase().includes(search.toLowerCase()) ||
        t.explanation.toLowerCase().includes(search.toLowerCase())
      )
    : terms;

  const handleJump = useCallback(
    (paperId: string) => {
      requestJumpToPaper(paperId);
      onClose();
    },
    [onClose, requestJumpToPaper]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-navy-800 bg-navy-950"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-navy-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>📚</span>
                <h2 className="text-sm font-semibold text-slate-100">术语表实验室</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-navy-800 hover:text-slate-100"
                aria-label="关闭"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="shrink-0 border-b border-navy-800 p-3">
              <input
                type="search"
                placeholder="搜索术语…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-navy-600 focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {terms.length === 0 ? "暂无术语，划词后可存入" : "无匹配结果"}
                </p>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((t) => (
                    <li
                      key={`${t.word}-${t.sourcePaperId}-${t.addedTime}`}
                      className="rounded-lg border border-navy-800 bg-navy-900/60 p-3 transition-colors hover:border-navy-700 hover:bg-navy-800"
                    >
                      <p className="font-medium text-navy-500">{t.word}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {t.explanation || "（待茶茶生成大白话解释）"}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleJump(t.sourcePaperId)}
                        className="mt-2 text-[11px] text-navy-500 hover:underline"
                      >
                        跳转到来源论文 →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
