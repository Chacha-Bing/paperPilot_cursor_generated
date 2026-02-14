/**
 * chatStore - 对话相关全局状态
 *
 * 管理消息列表、流式内容、reasoning 折叠、划词上下文、待注入提示等。
 */
import { create } from "zustand";

import { DBService } from "@/services/db.service";

const dbService = new DBService();

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; reasoning?: string };

export interface ChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  reasoningContent: string;
  streamingContent: string;
  selectionContext: string | null;
  pendingPrompt: { prompt: string; selectionContext?: string } | null;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  appendStreamingContent: (chunk: string) => void;
  clearStreamingContent: () => void;
  setIsThinking: (value: boolean) => void;
  appendReasoning: (chunk: string) => void;
  resetReasoning: () => void;
  setSelectionContext: (ctx: string | null) => void;
  setPendingPrompt: (p: { prompt: string; selectionContext?: string } | null) => void;
  injectChachaHint: (comment: string, paperId?: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isThinking: false,
  reasoningContent: "",
  streamingContent: "",
  selectionContext: null,
  pendingPrompt: null,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  clearStreamingContent: () => set({ streamingContent: "" }),
  setIsThinking: (value) => set({ isThinking: value }),
  appendReasoning: (chunk) =>
    set((state) => ({ reasoningContent: state.reasoningContent + chunk })),
  resetReasoning: () => set({ reasoningContent: "" }),
  setSelectionContext: (ctx) => set({ selectionContext: ctx }),
  setPendingPrompt: (p) => set({ pendingPrompt: p }),
  injectChachaHint: (comment, paperId) =>
    set((state) => {
      const newMsg = { role: "assistant" as const, content: comment };
      if (paperId) {
        dbService.addMessage({
          paperId,
          role: "assistant",
          content: comment,
          timestamp: Date.now(),
          isMemorySynced: false
        });
      }
      return { messages: [...state.messages, newMsg] };
    })
}));

