/**
 * QualityJudge - M1 关卡二：鉴宝专家（质量评估）
 *
 * 三张论文卡片（视觉误导型/经典基石型/最新追新版），用户选出最值得精读的一篇。
 */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type CardKey = "A" | "B" | "C";

interface QualityJudgeProps {
  onPassed: () => void;
}

export function QualityJudge(props: QualityJudgeProps) {
  const { onPassed } = props;

  const [selected, setSelected] = useState<CardKey | null>(null);
  const [chacha, setChacha] = useState<string>(
    "从三张“论文卡片”中，选出最值得你花时间精读的一篇。"
  );
  const [passed, setPassed] = useState(false);

  const handleSelect = (key: CardKey) => {
    setSelected(key);

    if (key === "A") {
      setChacha(
        "别被标题骗啦！正规论文通常不会用 Revolutionary 这种夸张的词，而且它没有经过同行评审。"
      );
    } else if (key === "B") {
      setChacha(
        "眼光不错！这是大模型时代的开山之作，NeurIPS 是 AI 界的奥斯卡，这种高引用的经典必读。"
      );
      if (!passed) {
        setPassed(true);
        onPassed();
      }
    } else {
      setChacha(
        "虽然很新，但它还处于预印本阶段，适合进阶阅读。对于入门者，我们先抓大放小，选最经典的 B。"
      );
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          关卡二
        </p>
        <h2 className="text-xl font-semibold text-slate-50">
          鉴宝专家 · 论文质量评估
        </h2>
        <p className="text-xs text-slate-400">
          标题再炸裂、话术再花哨，如果没有可靠的发表平台和引用支撑，那都只是“学术烟花”。
        </p>
      </header>

      <motion.div
        className="grid gap-4 md:grid-cols-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <PaperCard
          variant="A"
          title="Revolutionary AI Model: Solving Everything perfectly."
          venue="个人博客 / 开放论坛"
          citations="12（多为社交媒体转发）"
          active={selected === "A"}
          onClick={() => handleSelect("A")}
        />
        <PaperCard
          variant="B"
          title="Attention Is All You Need"
          venue="NeurIPS（顶级会议）"
          citations="100,000+"
          active={selected === "B"}
          highlight
          onClick={() => handleSelect("B")}
        />
        <PaperCard
          variant="C"
          title="Optimizing KV Cache for Long Context in 2026"
          venue="arXiv（预印本）"
          citations="2"
          active={selected === "C"}
          onClick={() => handleSelect("C")}
        />
      </motion.div>

      <p className="rounded-lg bg-slate-900/80 p-3 text-xs text-slate-200">
        <span className="font-semibold text-chacha-amber">茶茶：</span>
        <span className="ml-1">{chacha}</span>
      </p>
    </section>
  );
}

interface PaperCardProps {
  variant: CardKey;
  title: string;
  venue: string;
  citations: string;
  highlight?: boolean;
  active: boolean;
  onClick: () => void;
}

function PaperCard(props: PaperCardProps) {
  const { variant, title, venue, citations, highlight, active, onClick } = props;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-full flex-col justify-between rounded-xl border p-4 text-left text-xs transition-all",
        active
          ? "border-chacha-amber ring-2 ring-chacha-amber/40"
          : "border-slate-800 hover:border-slate-500",
        highlight ? "bg-slate-900" : "bg-slate-950/40"
      ].join(" ")}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-300">
          卡片{variant}
        </p>
        <p className="text-sm font-semibold text-slate-50">{title}</p>
        <p className="text-[11px] text-slate-400">发表平台：{venue}</p>
        <p className="text-[11px] text-slate-400">引用数：{citations}</p>
      </div>
      <div className="mt-3 text-[10px] text-slate-500">
        点击选择，茶茶会告诉你背后的判断标准。
      </div>
    </button>
  );
}

