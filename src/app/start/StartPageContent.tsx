/**
 * StartPageContent - M1 训练营交互内容（Client）
 *
 * 负责 localStorage 检查、关卡状态、路由跳转。
 * 父页面为 Server Component，可服务端渲染外层布局。
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SearchTraining } from "@/components/m1/SearchTraining";
import { QualityJudge } from "@/components/m1/QualityJudge";
import { TerminologyLink } from "@/components/m1/TerminologyLink";

const ONBOARDING_KEY = "PP_HAS_GUIDED";

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "精准搜索 · 搜商训练",
  2: "鉴宝专家 · 质量评估",
  3: "破译密语 · 黑话连线"
};

export function StartPageContent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasGuided = window.localStorage.getItem(ONBOARDING_KEY) === "true";
    if (hasGuided) {
      router.replace("/");
    }
  }, [router]);

  const handleStep1Passed = () => setStep(2);
  const handleStep2Passed = () => setStep(3);
  const handleStep3Passed = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    }
    router.push("/");
  };

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-950/80 p-6 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-chacha-amber tracking-wide uppercase">
              M1 · 学术启航训练营
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              和茶茶一起，换个姿势读论文
            </h1>
          </div>
          <div className="hidden text-right text-xs text-slate-400 sm:block">
            <p>当前关卡：</p>
            <p className="mt-1 font-semibold text-slate-100">
              {STEP_TITLES[step]}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300">
          茶茶会用三个渐进式的小关卡，带你完成从「搜不到 / 看不懂 / 记不住」到「敢搜、敢读、敢问」的第一次飞跃。
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 rounded-full bg-slate-900/90">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-chacha-amber to-emerald-400 transition-[width]"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            第 <span className="font-semibold text-slate-100">{step}</span> / 3 关
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-2 text-[11px] text-slate-400">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={[
                  "flex items-center gap-1 rounded-full border px-2 py-1",
                  s < step
                    ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                    : s === step
                      ? "border-chacha-amber/70 bg-chacha-amber/10 text-chacha-amber"
                      : "border-slate-700 bg-slate-900/70"
                ].join(" ")}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px]">
                  {s}
                </span>
                <span>{STEP_TITLES[s]}</span>
              </div>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(ONBOARDING_KEY, "true");
              }
              router.push("/");
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
          >
            跳过，直接进实验室
          </button>
        </div>
      </header>

      <section className="relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SearchTraining onPassed={handleStep1Passed} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <QualityJudge onPassed={handleStep2Passed} />
            </motion.div>
          )}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TerminologyLink onPassed={handleStep3Passed} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
