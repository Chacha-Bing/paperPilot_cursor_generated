/**
 * ParsingState - AI 预解析中状态
 */
"use client";

import { motion } from "framer-motion";
import type { PreparseProgress } from "@/services/preparse.service";

interface ParsingStateProps {
  fileName: string | null;
  progress: PreparseProgress | null;
  error: string | null;
}

export function ParsingState(props: ParsingStateProps) {
  const { fileName, progress, error } = props;

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-2xl space-y-4 rounded-xl border border-navy-800 bg-navy-900/80 p-6 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-xs text-navy-500">茶茶正在预读</p>
        <h2 className="text-lg font-semibold text-slate-50">
          {fileName ?? "正在解析论文…"}
        </h2>
        {error ? (
          <p className="mt-3 text-sm text-rose-400">{error}</p>
        ) : (
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <p className="font-medium text-slate-200">
              {progress?.message ?? "茶茶正在帮你翻开书页…"}
            </p>
            <ul className="mt-2 space-y-1 text-slate-400">
              <li>· 正在扫描目录，寻找作者的"小心机"…</li>
              <li>· 正在标记关键公式，准备开启苏格拉底模式…</li>
              <li>· 发现你可能感兴趣的黑话，正在录入术语表…</li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              等下可以试试点击那些琥珀色波浪线，那是学长为你留的线索哦～
            </p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
