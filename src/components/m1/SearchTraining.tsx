/**
 * SearchTraining - M1 关卡一：精准搜索（搜商训练）
 *
 * 用户通过四维筛选（时间/类型/分级/开源）将 100000+ 论文压缩到 1 篇目标。
 * 选对数字锐减，选错反弹。茶茶气泡实时反馈。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type TimeOption = "2024+" | "2020-2023" | "earlier";
type TypeOption = "survey" | "conf" | "journal";
type RankOption = "ccf-a" | "ccf-bc" | "any";
type CodeOption = "with-code" | "paper-only";

interface OptionMeta {
  label: string;
  value: string;
  correct: boolean;
  chacha: string;
}

const timeOptions: OptionMeta[] = [
  {
    label: "2024年之后",
    value: "2024+",
    correct: true,
    chacha: "漂亮！科研就是要追新，2024年后的成果代表了现在的 SOTA 状态。"
  },
  {
    label: "2020 - 2023",
    value: "2020-2023",
    correct: false,
    chacha: "虽然这些年份也有不少好文，但茶茶想带你看最“热乎”的。"
  },
  {
    label: "更早以前",
    value: "earlier",
    correct: false,
    chacha: "太久远啦！这些可能已经变成“教科书常识”了，咱们得往前看。"
  }
];

const typeOptions: OptionMeta[] = [
  {
    label: "综述 (Survey)",
    value: "survey",
    correct: true,
    chacha:
      "选得准！综述是领域地图，不生产路，但告诉你所有的路在哪。"
  },
  {
    label: "会议论文 (Conf)",
    value: "conf",
    correct: false,
    chacha: "会议论文虽然创新多，但太细碎了，新手容易看晕哦。"
  },
  {
    label: "期刊论文 (Journal)",
    value: "journal",
    correct: false,
    chacha: "期刊论文通常很长且深奥，咱们先找“地图”（综述）带路吧。"
  }
];

const rankOptions: OptionMeta[] = [
  {
    label: "CCF-A",
    value: "ccf-a",
    correct: true,
    chacha:
      "眼光毒辣！CCF-A 类代表了国际顶尖水准，含金量极高。"
  },
  {
    label: "CCF-B / C",
    value: "ccf-bc",
    correct: false,
    chacha: "虽然也不错，但既然要学，茶茶想带你直接看世界顶峰的风景。"
  },
  {
    label: "普通/不限",
    value: "any",
    correct: false,
    chacha:
      "数据库里鱼龙混杂，不看分级的话，很容易搜到“水刊”哦。"
  }
];

const codeOptions: OptionMeta[] = [
  {
    label: "包含代码",
    value: "with-code",
    correct: true,
    chacha:
      "【通关】狙击成功！只有能复现的代码才是科研的良心。走，咱们去实验室！"
  },
  {
    label: "仅论文",
    value: "paper-only",
    correct: false,
    chacha: "有些论文只吹牛不给代码，咱们新手还是先找能动手实践的吧。"
  }
];

const TARGET_PAPER =
  "A Comprehensive Survey on LLM Hallucinations (CVPR 2024, 含开源代码)";

interface SearchTrainingProps {
  onPassed: () => void;
}

export function SearchTraining(props: SearchTrainingProps) {
  const { onPassed } = props;

  const [time, setTime] = useState<TimeOption | null>(null);
  const [type, setType] = useState<TypeOption | null>(null);
  const [rank, setRank] = useState<RankOption | null>(null);
  const [code, setCode] = useState<CodeOption | null>(null);
  const [count, setCount] = useState<number>(100_000);
  const [displayCount, setDisplayCount] = useState<number>(100_000);
  const [chacha, setChacha] = useState<string>(
    "小萌新，我们需要找一篇 2024 年之后发表、计算机 A 类会议 (CCF-A)、属于“综述 (Survey)”类型、且必须包含开源代码的深度学习论文。"
  );
  const [showResult, setShowResult] = useState(false);
  const [passed, setPassed] = useState(false);

  const allCorrect = useMemo(
    () =>
      time === "2024+" &&
      type === "survey" &&
      rank === "ccf-a" &&
      code === "with-code",
    [time, type, rank, code]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setDisplayCount((prev) => prev + (count - prev) * 0.3);
    }, 80);
    return () => window.clearInterval(id);
  }, [count]);

  const updateCountAndChacha = (option: OptionMeta) => {
    setChacha(option.chacha);

    if (option.correct) {
      setCount((prev) => Math.max(1, Math.floor(prev * (0.1 + Math.random() * 0.2))));
    } else {
      setCount((prev) => Math.min(200_000, Math.floor(prev * (2 + Math.random()))));
    }
  };

  const handleSearch = () => {
    if (!allCorrect) return;
    setShowResult(true);
    setChacha(
      "狙击成功！下面这篇就是我们要找的目标论文，等会在 M2 实验室里，茶茶会带你拆开来看～"
    );
    if (!passed) {
      setPassed(true);
      onPassed();
    }
  };

  const canSearch =
    time !== null && type !== null && rank !== null && code !== null && allCorrect;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.75)]">
      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          关卡一
        </p>
        <h2 className="text-xl font-semibold text-slate-50">
          精准搜索 · 搜商训练
        </h2>
        <p className="text-xs text-slate-400">
          在不看答案的前提下，通过多维筛选，把 100000+ 篇论文一步步“压缩”到唯一一篇目标论文。
        </p>
        <p className="rounded-lg bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-200">
          <span className="font-semibold text-chacha-amber">茶茶的任务指令：</span>
          小萌新，我们需要找一篇{" "}
          <span className="font-semibold">2024 年之后发表</span>、
          <span className="font-semibold">计算机 A 类会议 (CCF-A)</span>、
          属于 <span className="font-semibold">综述 (Survey)</span> 类型、
          且必须包含 <span className="font-semibold">开源代码</span> 的深度学习论文。
        </p>
      </header>

      <motion.div
        className="space-y-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400">
              当前数据库中符合条件的论文数量
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-chacha-amber">
              {displayCount > 1 ? `${Math.round(displayCount)}+` : "1"}
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] text-slate-300">
            模拟 Google Scholar / 学术数据库
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          每次选择都会即时反馈：选对就锐减，选错就反弹。试着把数字精确「压缩」到 1。
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <FilterGroup
          label="发表时间"
          options={timeOptions}
          value={time}
          onChange={(meta) => {
            setTime(meta.value as TimeOption);
            updateCountAndChacha(meta);
          }}
        />
        <FilterGroup
          label="文献类型"
          options={typeOptions}
          value={type}
          onChange={(meta) => {
            setType(meta.value as TypeOption);
            updateCountAndChacha(meta);
          }}
        />
        <FilterGroup
          label="分级权重"
          options={rankOptions}
          value={rank}
          onChange={(meta) => {
            setRank(meta.value as RankOption);
            updateCountAndChacha(meta);
          }}
        />
        <FilterGroup
          label="开源状态"
          options={codeOptions}
          value={code}
          onChange={(meta) => {
            setCode(meta.value as CodeOption);
            updateCountAndChacha(meta);
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="flex-1 rounded-lg bg-slate-900/80 p-3 text-xs text-slate-200">
          <span className="font-semibold text-chacha-amber">茶茶：</span>
          <span className="ml-1">{chacha}</span>
        </p>
        <button
          type="button"
          disabled={!canSearch}
          onClick={handleSearch}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          开始检索
        </button>
      </div>

      {showResult ? (
        <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <p className="font-semibold">检索结果 · 1 篇命中</p>
          <p className="mt-1 text-[11px] text-emerald-100/90">{TARGET_PAPER}</p>
        </div>
      ) : null}
    </section>
  );
}

interface FilterGroupProps {
  label: string;
  options: OptionMeta[];
  value: string | null;
  onChange: (option: OptionMeta) => void;
}

function FilterGroup(props: FilterGroupProps) {
  const { label, options, value, onChange } = props;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option)}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                selected
                  ? option.correct
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400 bg-rose-500/10 text-rose-100"
                  : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-400"
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

