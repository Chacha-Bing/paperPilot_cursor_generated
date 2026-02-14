/**
 * SelectionToolbar - 划词工具栏
 *
 * 划词后弹出，提供「大白话」「背景知识」「存入术语表」等快捷操作。
 */
"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { usePaperStore } from "@/store/paperStore";
import { useChatStore } from "@/store/chatStore";
import { db } from "@/lib/db";

interface SelectionToolbarProps {
  paperId: string;
}

export function SelectionToolbar(props: SelectionToolbarProps) {
  const { paperId } = props;
  const toolbar = usePaperStore((s) => s.selectionToolbar);
  const setToolbar = usePaperStore((s) => s.setSelectionToolbar);
  const bumpGlossaryVersion = usePaperStore((s) => s.bumpGlossaryVersion);
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);

  const handleBaihua = useCallback(() => {
    if (!toolbar) return;
    const prompt = `这段话太绕了，请结合大一新生的知识储备，用生活里的例子给我讲一遍：\n\n「${toolbar.text}」`;
    setPendingPrompt({ prompt, selectionContext: toolbar.text });
    setToolbar(null);
  }, [toolbar, setPendingPrompt, setToolbar]);

  const handleBackground = useCallback(() => {
    if (!toolbar) return;
    const prompt = `请解释该段落提到的算法/理论的历史演进：\n\n「${toolbar.text}」`;
    setPendingPrompt({ prompt, selectionContext: toolbar.text });
    setToolbar(null);
  }, [toolbar, setPendingPrompt, setToolbar]);

  const handleSaveTerm = useCallback(async () => {
    if (!toolbar) return;
    const term = toolbar.text.trim().slice(0, 100);
    if (!term) return;
    await db.glossary.put({
      word: term,
      explanation: "（待茶茶生成大白话解释）",
      sourcePaperId: paperId,
      addedTime: Date.now(),
      masteryLevel: 0.5
    });
    bumpGlossaryVersion();
    setToolbar(null);
    setPendingPrompt({
      prompt: `请用一句话给「${term}」写一个学术大白话解释，我会存入术语表。`
    });
  }, [toolbar, paperId, bumpGlossaryVersion, setPendingPrompt, setToolbar]);

  return (
    <AnimatePresence>
      {toolbar ? (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[100] flex gap-1 rounded-lg border border-navy-700 bg-navy-900 px-2 py-1.5"
          style={{
            left: toolbar.x + 8,
            top: toolbar.y - 40
          }}
        >
          <button
            type="button"
            onClick={handleBaihua}
            className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy-600"
          >
            学术大白话
          </button>
          <button
            type="button"
            onClick={handleBackground}
            className="rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy-600"
          >
            追问背景
          </button>
          <button
            type="button"
            onClick={handleSaveTerm}
            className="rounded-lg bg-navy-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy-500"
          >
            存入术语表
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
