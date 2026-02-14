/**
 * EmptyState - 冷启动上传区（带侧边栏）
 */
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WorkflowSidebar } from "@/components/m2/WorkflowSidebar";

interface EmptyStateProps {
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onInputChange: React.ChangeEventHandler<HTMLInputElement>;
}

export function EmptyState(props: EmptyStateProps) {
  const { onDrop, onInputChange } = props;
  const router = useRouter();

  const handleSelectPaper = useCallback(
    (id: string) => {
      router.push(`/${encodeURIComponent(id)}`);
    },
    [router]
  );

  const preventDefault: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
  };

  return (
    <section className="flex min-h-0 flex-1 overflow-hidden">
      <WorkflowSidebar
        currentPaperId={null}
        currentFileName={null}
        scrollProgress={0}
        onSelectPaper={handleSelectPaper}
        showAddNew
      />
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <motion.div
          className="w-full max-w-3xl space-y-6 rounded-xl border border-navy-800 bg-navy-900/80 p-8 text-center"
          onDrop={onDrop}
          onDragOver={preventDefault}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-slate-100">
            你好！欢迎来到茶茶的学术实验室
          </h2>
          <p className="text-sm text-slate-300">
            点击或拖入一份 PDF，茶茶会先帮你快速预读，拆出研究动机、方法、结果和局限。
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 text-xs text-slate-300">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-500">
              选择本地 PDF
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onInputChange}
              />
            </label>
            <p className="text-[11px] text-slate-500">
              或直接把 PDF 拖到这块区域
            </p>
          </div>

          <div className="mt-6 grid gap-4 text-left text-xs text-slate-300 md:grid-cols-3">
            <FeatureCard title="AI 预读">
              自动拆解 Motivation / Method / Result / Gap，生成一键解构看板。
            </FeatureCard>
            <FeatureCard title="伴学引导">
              苏格拉底提问带你手撕难点，不懂就追问，直到你自己说出来为止。
            </FeatureCard>
            <FeatureCard title="知识积累">
              划词存入术语表，后续阅读任何论文遇到相同词汇都会自动高亮提醒。
            </FeatureCard>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  title: string;
  children: React.ReactNode;
}

function FeatureCard(props: FeatureCardProps) {
  const { title, children } = props;

  return (
    <div className="rounded-lg border border-navy-800 bg-navy-900/60 p-3 text-xs">
      <p className="font-semibold text-slate-100">{title}</p>
      <p className="mt-1 text-slate-300">{children}</p>
    </div>
  );
}
