/**
 * preparse Server Action
 *
 * "use server" 标记的函数在服务端执行，客户端调用时自动发起 RPC。
 * 适用于非流式、可序列化返回的 AI 调用，可替代独立 API 路由。
 *
 * 注意：流式对话（chat）仍需 /api/chat，因 Server Action 无法流式返回。
 */
"use server";

import { AIService } from "@/services/ai.service";

export async function preparseAction(paperText: string, title: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY 配置，无法调用 AI 预解析。");
  }

  const ai = new AIService(apiKey);
  return await ai.preparse(paperText, title);
}
