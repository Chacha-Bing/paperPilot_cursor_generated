/**
 * paperStore - 论文/阅读相关全局状态
 *
 * 管理当前论文 ID、页码、引用跳转目标、侧边栏跳转请求等。
 */
import { create } from "zustand";

export interface AnchorState {
  id: string;
  page: number;
}

export interface SelectionToolbarState {
  x: number;
  y: number;
  text: string;
}

export interface CitationTarget {
  page: number;
  line?: number;
}

export interface PaperState {
  currentPaperId: string | null;
  currentPage: number;
  scale: number;
  anchors: AnchorState[];
  selectionToolbar: SelectionToolbarState | null;
  /** 精准引用目标：点击 [[page,line]] 后触发滚动并高亮 */
  citationTarget: CitationTarget | null;
  /** 术语/侧边栏请求跳转到某论文 */
  jumpToPaperId: string | null;
  /** 术语表更新版本号，PdfVirtualViewer 依赖此刷新高亮 */
  glossaryVersion: number;
  setCurrentPaperId: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setAnchors: (anchors: AnchorState[]) => void;
  setSelectionToolbar: (t: SelectionToolbarState | null) => void;
  /** 滚动到指定页/行并闪烁高亮 */
  scrollToCitation: (page: number, line?: number) => void;
  clearCitationTarget: () => void;
  /** 请求跳转到指定论文（术语表/侧边栏用） */
  requestJumpToPaper: (id: string) => void;
  clearJumpToPaper: () => void;
  bumpGlossaryVersion: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  currentPaperId: null,
  currentPage: 1,
  scale: 1,
  anchors: [],
  selectionToolbar: null,
  citationTarget: null,
  jumpToPaperId: null,
  glossaryVersion: 0,
  setCurrentPaperId: (id) => set({ currentPaperId: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setScale: (scale) => set({ scale }),
  setAnchors: (anchors) => set({ anchors }),
  setSelectionToolbar: (t) => set({ selectionToolbar: t }),
  scrollToCitation: (page, line) => set({ citationTarget: { page, line } }),
  clearCitationTarget: () => set({ citationTarget: null }),
  requestJumpToPaper: (id) => set({ jumpToPaperId: id }),
  clearJumpToPaper: () => set({ jumpToPaperId: null }),
  bumpGlossaryVersion: () => set((s) => ({ glossaryVersion: s.glossaryVersion + 1 }))
}));

