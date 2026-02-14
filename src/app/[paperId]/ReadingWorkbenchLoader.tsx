/**
 * ReadingWorkbenchLoader - 客户端加载器
 *
 * 仅负责动态 import ReadingWorkbench（ssr: false），避免 IndexedDB 在服务端执行。
 * 父页面保持 Server Component，可服务端渲染「论文 ID 无效」等静态文案。
 */
"use client";

import dynamic from "next/dynamic";

const ReadingWorkbench = dynamic(
  () =>
    import("@/components/m2/ReadingWorkbench").then((m) => ({
      default: m.ReadingWorkbench
    })),
  { ssr: false }
);

interface ReadingWorkbenchLoaderProps {
  paperId: string;
}

export function ReadingWorkbenchLoader(props: ReadingWorkbenchLoaderProps) {
  return <ReadingWorkbench paperId={props.paperId} />;
}
