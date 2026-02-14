/**
 * TerminologyLink - M1 关卡三：破译密语（黑话连线）
 *
 * 用户完成 5 组术语连线后，显示「启动实验室」按钮。
 * 点击后将 5 个术语初始化到 IndexedDB glossary 表，并跳转至 M2。
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/db";

interface TermPair {
  id: string;
  left: string;
  right: string;
  explanation: string;
}

const TERMS: TermPair[] = [
  {
    id: "abstract",
    left: "Abstract",
    right: "摘要",
    explanation:
      "就像电影预告片，用几百字告诉你这篇论文干了啥，看完决定要不要下载。"
  },
  {
    id: "survey",
    left: "Review / Survey",
    right: "综述",
    explanation:
      "领域地图，不生产新知识，但会总结过去几年这个方向所有牛逼的研究。"
  },
  {
    id: "if",
    left: "Impact Factor (IF)",
    right: "影响因子",
    explanation:
      "期刊的“身价”，数字越高，说明在这本杂志上发的论文被引用得越多。"
  },
  {
    id: "peer-review",
    left: "Peer Review",
    right: "同行评审",
    explanation:
      "学术界的“安检”，你写的论文要让几个匿名专家审一遍，他们点头了才能发表。"
  },
  {
    id: "open-access",
    left: "Open Access (OA)",
    right: "开放获取",
    explanation:
      "学术界的“免票入场”，作者付费，读者免费看，不用校园网也能直接下全文。"
  }
];

interface TerminologyLinkProps {
  onPassed: () => void;
}

/** 将 M1 学会的 5 个术语初始化到术语表（PRD：通关后落库） */
async function initM1GlossaryToDb(): Promise<void> {
  const now = Date.now();
  const M1_SOURCE = "";
  for (const t of TERMS) {
    await db.glossary.put({
      word: t.left,
      explanation: t.explanation,
      sourcePaperId: M1_SOURCE,
      addedTime: now,
      masteryLevel: 0
    });
  }
}

export function TerminologyLink(props: TerminologyLinkProps) {
  const { onPassed } = props;

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>(
    "把左边的英文术语和右边的中文释义一一连起来，看看你能不能把“黑话”翻译成“人话”。"
  );
  const [allMatched, setAllMatched] = useState(false);
  const [launching, setLaunching] = useState(false);

  const handleLeftClick = (id: string) => {
    if (matchedIds.includes(id)) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (right: string) => {
    if (!selectedLeft) return;

    const pair = TERMS.find((term) => term.id === selectedLeft);
    if (!pair) return;

    if (pair.right === right) {
      const nextMatched = [...matchedIds, pair.id];
      setMatchedIds(nextMatched);
      setSelectedLeft(null);
      setSelectedRight(null);
      setMessage(`茶茶说：${pair.explanation}`);

      if (nextMatched.length === TERMS.length) {
        setAllMatched(true);
      }
    } else {
      setSelectedRight(right);
      setMessage("先别急，想想这个词出现在论文里时，大概是在讲什么场景？");
    }
  };

  const rightsShuffled = [...TERMS]
    .map((term) => term.right)
    .sort((a, b) => a.localeCompare(b));

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          关卡三
        </p>
        <h2 className="text-xl font-semibold text-slate-50">
          破译密语 · 黑话连线
        </h2>
        <p className="text-xs text-slate-400">
          学术世界的“黑话”，背后都有对应的生活场景。把它们连起来，你就把论文的一半恐惧感拆掉了。
        </p>
      </header>

      <motion.div
        className="grid gap-6 md:grid-cols-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-300">英文术语</p>
          <div className="space-y-2">
            {TERMS.map((term) => {
              const matched = matchedIds.includes(term.id);
              const active = selectedLeft === term.id;
              return (
                <button
                  key={term.id}
                  type="button"
                  disabled={matched}
                  onClick={() => handleLeftClick(term.id)}
                  className={[
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs",
                    matched
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                      : active
                        ? "border-chacha-amber bg-slate-900 text-slate-50"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-400"
                  ].join(" ")}
                >
                  <span>{term.left}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-300">中文释义</p>
          <div className="space-y-2">
            {rightsShuffled.map((right) => {
              const matched = matchedIds.some((id) => {
                const term = TERMS.find((t) => t.id === id);
                return term?.right === right;
              });
              const active = selectedRight === right;
              return (
                <button
                  key={right}
                  type="button"
                  disabled={matched}
                  onClick={() => handleRightClick(right)}
                  className={[
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs",
                    matched
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                      : active
                        ? "border-rose-500 bg-slate-900 text-slate-50"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-400"
                  ].join(" ")}
                >
                  <span>{right}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <p className="rounded-lg bg-slate-900/80 p-3 text-xs text-slate-200">
        <span className="font-semibold text-chacha-amber">茶茶：</span>
        <span className="ml-1">{message}</span>
      </p>

      {allMatched && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-2"
        >
          <button
            type="button"
            disabled={launching}
            onClick={async () => {
              setLaunching(true);
              await initM1GlossaryToDb();
              onPassed();
            }}
            className="rounded-xl bg-gradient-to-r from-chacha-amber to-emerald-500 px-8 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-opacity hover:opacity-95 disabled:opacity-70"
          >
            {launching ? "正在启动…" : "✨ 启动实验室"}
          </button>
        </motion.div>
      )}
    </section>
  );
}

