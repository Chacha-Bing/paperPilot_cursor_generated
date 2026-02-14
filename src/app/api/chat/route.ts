/**
 * POST /api/chat - 流式对话接口
 *
 * 接收 messages，调用 AIService.streamChat，返回 NDJSON 流（content + reasoning_content）。
 */
import { NextResponse } from "next/server";

import { AIService } from "@/services/ai.service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 DEEPSEEK_API_KEY 配置，无法调用 AI 服务。" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    messages: { role: "system" | "user" | "assistant"; content: string }[];
  };

  const ai = new AIService(apiKey);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of ai.streamChat({ messages: body.messages })) {
          const payload = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`${payload}\n`));
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson"
    }
  });
}

