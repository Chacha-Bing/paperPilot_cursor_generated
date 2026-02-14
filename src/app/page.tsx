/**
 * 首页 - 上传 PDF 入口
 *
 * 完成 onboarding 后渲染 ReadingWorkbench(paperId=null)，展示上传区域。
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ReadingWorkbench = dynamic(
  () =>
    import("@/components/m2/ReadingWorkbench").then((m) => ({
      default: m.ReadingWorkbench
    })),
  { ssr: false }
);

const ONBOARDING_KEY = "PP_HAS_GUIDED";

export default function HomePage() {
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasGuided = window.localStorage.getItem(ONBOARDING_KEY) === "true";
    if (!hasGuided) {
      router.replace("/start");
    } else {
      setCheckedOnboarding(true);
    }
  }, [router]);

  if (!checkedOnboarding) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <p className="text-sm text-slate-400">
          茶茶正在帮你检查训练营完成状态，请稍候…
        </p>
      </main>
    );
  }

  return <ReadingWorkbench paperId={null} />;
}

