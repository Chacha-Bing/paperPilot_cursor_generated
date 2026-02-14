/**
 * POST /api/preparse - AI 预解析接口
 *
 * 接收 paperText、title，调用 AIService.preparse，直接返回 AI 原始 JSON。
 * 字段兼容由 preparse.service 在客户端处理。
 */
import { NextResponse } from "next/server";

import { AIService } from "@/services/ai.service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    paperText: string;
    title: string;
  };

  if (!body.paperText || !body.title) {
    return NextResponse.json(
      { error: "缺少 paperText 或 title 参数。" },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 DEEPSEEK_API_KEY 配置，无法调用 AI 预解析。" },
      { status: 500 }
    );
  }

  try {
    const ai = new AIService(apiKey);
    const result = await ai.preparse(body.paperText, body.title);
    return NextResponse.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Preparse error:", err);
    return NextResponse.json(
      { error: "AI 预解析失败，请重试。" },
      { status: 500 }
    );
  }
}
