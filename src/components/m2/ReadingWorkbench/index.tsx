/**
 * ReadingWorkbench - M2 结构化阅读工作台
 *
 * 核心职责：
 * - 管理工作台状态：empty（上传页）| parsing（预解析中）| reading（阅读中）
 * - 从路由 /[paperId] 加载论文，若解构完整则直接进入阅读，否则触发 preparse
 * - 处理 PDF 上传、预解析、侧边栏切换论文
 *
 * 关键流程：
 * 1. 上传：handleFileChosen -> savePaperFromFile -> runPreparse -> 验证持久化 -> router.replace
 * 2. 从路由加载：useEffect 根据 routePaperId 拉取论文，有解构则 reading，否则 runPreparse
 * 3. 侧边栏点击：onSelectPaper -> router.push -> 触发上述 useEffect
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GlossarySidebar } from "@/components/m2/GlossarySidebar";
import { EmptyState } from "@/components/m2/ReadingWorkbench/EmptyState";
import { ParsingState } from "@/components/m2/ReadingWorkbench/ParsingState";
import { ReadingState } from "@/components/m2/ReadingWorkbench/ReadingState";
import { db } from "@/lib/db";
import { DBService } from "@/services/db.service";
import { runPreparse, type PreparseProgress } from "@/services/preparse.service";
import { usePaperStore } from "@/store/paperStore";

type WorkbenchState = "empty" | "parsing" | "reading" | "completed";

const dbService = new DBService();

interface ReadingWorkbenchProps {
  /** 从路由 /[paperId] 传入的论文 ID，无则表示在 / 上传页 */
  paperId?: string | null;
}

export function ReadingWorkbench(props: ReadingWorkbenchProps) {
  const { paperId: routePaperId } = props;
  const router = useRouter();
  const [state, setState] = useState<WorkbenchState>(routePaperId ? "parsing" : "empty");
  const [fileName, setFileName] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(routePaperId ?? null);
  const [parseProgress, setParseProgress] = useState<PreparseProgress | null>(
    routePaperId ? { stage: "loading", message: "正在加载论文…" } : null
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const setCurrentPaperId = usePaperStore((s) => s.setCurrentPaperId);
  const jumpToPaperId = usePaperStore((s) => s.jumpToPaperId);
  const clearJumpToPaper = usePaperStore((s) => s.clearJumpToPaper);

  // 从路由 [paperId] 加载论文（含重试，避免 IndexedDB 写入未完成时误判）
  useEffect(() => {
    if (!routePaperId) return;
    let cancelled = false;
    (async () => {
      let paper = await db.papers.get(routePaperId);
      for (let i = 0; i < 3 && !paper && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1)));
        paper = await db.papers.get(routePaperId);
      }
      if (cancelled || !paper) {
        if (!cancelled && !paper) router.replace("/");
        return;
      }
      const d = paper.deconstruction;
      const isPreparsed =
        d?.motivation?.trim() &&
        d?.method?.trim() &&
        d?.result?.trim() &&
        d?.gap?.trim();
      if (isPreparsed) {
        setPaperId(paper.id);
        setFileName(paper.title);
        setState("reading");
        setCurrentPaperId(paper.id);
        return;
      }
      if (!cancelled) {
        await new Promise((r) => setTimeout(r, 400));
        const retry = await db.papers.get(routePaperId);
        if (retry?.deconstruction?.motivation?.trim() && retry?.deconstruction?.method?.trim()) {
          setPaperId(retry.id);
          setFileName(retry.title);
          setState("reading");
          setCurrentPaperId(retry.id);
          return;
        }
      }
      setPaperId(paper.id);
      setFileName(paper.title);
      setState("parsing");
      setParseProgress({ stage: "loading", message: "茶茶正在帮你翻开书页…" });
      try {
        await runPreparse(paper.id, (p) => setParseProgress(p));
        if (!cancelled) setState("reading");
      } catch (err) {
        if (!cancelled) {
          setParseError(err instanceof Error ? err.message : "预解析失败");
          setState("empty");
        }
      } finally {
        if (!cancelled) setParseProgress(null);
      }
    })();
    return () => { cancelled = true; };
  }, [routePaperId, router, setCurrentPaperId]);

  useEffect(() => {
    if (!jumpToPaperId) return;
    router.push(`/${encodeURIComponent(jumpToPaperId)}`);
    clearJumpToPaper();
  }, [jumpToPaperId, router, clearJumpToPaper]);

  const handleFileChosen = async (file: File) => {
    setFileName(file.name);
    setState("parsing");
    setParseError(null);
    setParseProgress({ stage: "loading", message: "茶茶正在帮你翻开书页…" });

    const record = await dbService.savePaperFromFile(file);
    setPaperId(record.id);
    setCurrentPaperId(record.id);

    try {
      await runPreparse(record.id, (p) => setParseProgress(p));
      let verified = await db.papers.get(record.id);
      for (let i = 0; i < 5 && !verified?.deconstruction?.motivation?.trim(); i++) {
        await new Promise((r) => setTimeout(r, 100 * (i + 1)));
        verified = await db.papers.get(record.id);
      }
      router.replace(`/${encodeURIComponent(record.id)}`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "预解析失败");
      setState("empty");
    } finally {
      setParseProgress(null);
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      handleFileChosen(file);
    }
  };

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileChosen(file);
    }
  };

  const [glossaryOpen, setGlossaryOpen] = useState(false);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-navy-950">
      <header className="flex shrink-0 items-center justify-between border-b border-navy-800/80 bg-navy-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-navy-500">
              M2 · 结构化阅读工作台
            </p>
            <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-100">
              茶茶的学术实验室
            </h1>
          </div>
          {state === "reading" && (
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-navy-700 hover:text-white"
              title="术语表"
            >
              <span aria-hidden>📚</span>
              术语表
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-1 text-[11px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {stateLabel(state)}
          </span>
        </div>
      </header>

      <GlossarySidebar
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      {state === "empty" && (
        <EmptyState onDrop={onDrop} onInputChange={onInputChange} />
      )}

      {state === "parsing" && (
        <ParsingState
          fileName={fileName}
          progress={parseProgress}
          error={parseError}
        />
      )}

      {state === "reading" && paperId && (
        <ReadingState
          fileName={fileName ?? "未命名论文.pdf"}
          paperId={paperId}
          onSwitchPaper={(id, _title) => router.push(`/${encodeURIComponent(id)}`)}
        />
      )}
    </main>
  );
}

function stateLabel(state: WorkbenchState): string {
  switch (state) {
    case "empty":
      return "冷启动";
    case "parsing":
      return "AI 预解析中";
    case "reading":
      return "阅读中";
    case "completed":
      return "已归档";
    default:
      return state;
  }
}
