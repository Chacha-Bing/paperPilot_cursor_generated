/**
 * 论文详情页 - 动态路由 /[paperId]
 *
 * Server Component：服务端解析 params，渲染「论文 ID 无效」等静态文案。
 * 仅客户端部分通过 ReadingWorkbenchLoader 加载（需 IndexedDB、PDF.js）。
 */
import { ReadingWorkbenchLoader } from "./ReadingWorkbenchLoader";

export default async function PaperPage({
  params
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;

  if (!paperId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <p className="text-sm text-slate-400">论文 ID 无效</p>
      </main>
    );
  }

  return (
    <ReadingWorkbenchLoader paperId={decodeURIComponent(paperId)} />
  );
}
