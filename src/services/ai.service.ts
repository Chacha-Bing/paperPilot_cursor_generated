/**
 * ai.service - DeepSeek API 对接
 *
 * 提供 preparse（预解析）和 streamChat（流式对话）。
 * API Key 通过环境变量 DEEPSEEK_API_KEY 配置。
 */
import OpenAI from "openai";

export interface StreamChunk {
  content: string;
  reasoning?: string;
}

export interface ChatPayload {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

export interface PreparseResult {
  deconstruction: {
    motivation: string;
    method: string;
    result: string;
    gap: string;
  };
  logic_anchors: Array<{
    anchor_text: string;
    page_hint: number;
    chacha_comment: string;
  }>;
  suggested_glossary?: Array<{ term: string; category: string }>;
}

/**
 * AIService 只负责与 DeepSeek/OpenAI 终端对接，保持与 UI 解耦。
 *
 * 注意：API Key 请通过环境变量配置，例如：
 * DEEPSEEK_API_KEY=sk-xxxx
 * 不要把密钥写入代码仓库，即便文档中给出了示例 key。
 */
export class AIService {
  private readonly client: OpenAI;

  public constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com"
    });
  }

  /**
   * 预解析：提取论文四支柱 + 逻辑锚点 + 建议术语。
   * 使用 deepseek-chat 非流式，要求返回纯 JSON。
   */
  public async preparse(
    paperText: string,
    title: string
  ): Promise<PreparseResult> {
    const sys = `你是 PaperPilot 的智能中枢「茶茶学长」。你拥有一篇论文的全文文本（已清洗）。任务是充当"先遣队"，为用户建立阅读地图。

TaskObjectives:
1. 核心解构：提取论文的四大支柱（Motivation, Method, Result, Gap）。
2. 逻辑锚点：寻找 3-5 处论文中最具启发性、或逻辑转折最硬核的段落。
3. 知识发现：识别出 5 个对新手有门槛的领域专有名词。

OutputRequirement: 必须且只能输出标准 JSON 格式，严禁任何解释性文字。`;

    const user = `--- 论文元数据 ---
Title: ${title}

--- 结构化文本片段 ---
${paperText}

--- 任务指令 ---
请基于上述内容，完成预解析任务。为每个"逻辑锚点"提供在原文中的精确字符串片段（anchor_text），以及 page_hint（页码，从 1 开始）和 chacha_comment（点击波浪线后茶茶的引导语）。`;

    const completion = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ]
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // 尝试解析 JSON（可能被 markdown 包裹）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let jsonStr = jsonMatch ? jsonMatch[0] : raw;
    // 修复 AI 返回的 JSON 中未转义的控制字符（如字符串内的换行、制表符）
    jsonStr = sanitizeJsonString(jsonStr);
    return JSON.parse(jsonStr) as PreparseResult;
  }

  /**
   * 使用 DeepSeek Reasoner 模式进行流式对话。
   * messages 中应包含 role: "system" 的上下文消息，以及 user/assistant 对话历史。
   */
  public async *streamChat(
    payload: ChatPayload
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const messages: OpenAI.ChatCompletionMessageParam[] = payload.messages;

    const stream = await this.client.chat.completions.create({
      model: "deepseek-reasoner",
      stream: true,
      messages
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      const content = delta.content ?? "";
      // @ts-expect-error: reasoning_content 是 DeepSeek 自定义字段
      const reasoning: string | undefined = delta.reasoning_content;

      if (content || reasoning) {
        yield { content, reasoning };
      }
    }
  }
}

/** 去除 JSON 字符串值内的未转义控制字符，避免 JSON.parse 报 Bad control character */
function sanitizeJsonString(str: string): string {
  let result = "";
  let inString = false;
  let escape = false;
  let quote: string | null = null;

  for (let i = 0; i < str.length; i++) {
    const c: string = str[i] ?? "";
    if (escape) {
      result += c;
      escape = false;
      continue;
    }
    if (c === "\\") {
      result += c;
      escape = true;
      continue;
    }
    if (inString) {
      if (c === quote) {
        inString = false;
        quote = null;
        result += c;
        continue;
      }
      // 在字符串内部，将控制字符转为转义形式
      if (c >= "\x00" && c <= "\x1f") {
        const map: Record<string, string> = {
          "\n": "\\n",
          "\r": "\\r",
          "\t": "\\t"
        };
        result += map[c] ?? `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
      } else {
        result += c;
      }
      continue;
    }
    if ((c === '"' || c === "'") && !inString) {
      inString = true;
      quote = c;
    }
    result += c;
  }
  return result;
}

