/**
 * /start - M1 学术启航训练营
 *
 * Server Component：服务端渲染外层布局与背景。
 * 仅 StartPageContent 为 Client，负责 localStorage、关卡状态、路由。
 */
import { StartPageContent } from "./StartPageContent";

export default function StartPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, #0f172acc, transparent 55%), radial-gradient(circle at bottom, #0b1120, transparent 55%)"
        }}
      />
      <StartPageContent />
    </main>
  );
}
