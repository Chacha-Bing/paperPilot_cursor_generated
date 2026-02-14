import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperPilot 实验室",
  description: "茶茶学长陪你结构化读论文的本地优先实验室"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}

