// 圧縮記憶生成モジュール（Haiku）
// 過去の相談ログを分析し、性格特性・成功/失敗パターンをJSON化する

import { HAIKU_COMPRESS_MEMORY_INSTRUCTION } from "./prompts";
import { getClient } from "./client";
import { calculateCost, logApiCost } from "@/lib/cost-tracker";
import type { CompressedMemory, CostInfo } from "@/lib/types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 400;

interface ConsultLogEntry {
  context: string;
  result: string;
  outcome?: string | null;
  outcomeRating?: number | null;
  createdAt: Date;
}

export interface CompressMemoryResult {
  memory: CompressedMemory;
  costInfo?: CostInfo;
}

/** usageからキャッシュトークン数を安全に取得するヘルパー */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCacheTokens(usage: any): { read: number; write: number } {
  return {
    read: (usage.cache_read_input_tokens as number) ?? 0,
    write: (usage.cache_creation_input_tokens as number) ?? 0,
  };
}

/**
 * 過去の相談ログから圧縮記憶を生成する
 */
export async function generateCompressedMemory(
  personNickname: string,
  logs: ConsultLogEntry[]
): Promise<CompressMemoryResult | null> {
  if (logs.length === 0) return null;

  const anthropic = getClient();

  // 相談ログをテキスト化（最新20件に制限）
  const recentLogs = logs.slice(-20);
  const logsText = recentLogs
    .map((log, i) => {
      const date = new Date(log.createdAt).toISOString().split("T")[0];
      let entry = `--- 相談${i + 1} (${date}) ---\n相談内容: ${log.context}\nアドバイス: ${log.result.slice(0, 200)}`;
      if (log.outcome) {
        entry += `\n結果メモ: ${log.outcome}`;
      }
      if (log.outcomeRating) {
        entry += `\n評価: ${log.outcomeRating}/5`;
      }
      return entry;
    })
    .join("\n\n");

  const userMessage = `## 対象人物: ${personNickname}
## 相談回数: ${logs.length}回

${logsText}`;

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: HAIKU_COMPRESS_MEMORY_INSTRUCTION,
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    const cache = getCacheTokens(response.usage);

    const costInfo =
      process.env.NODE_ENV === "development"
        ? calculateCost(HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write)
        : undefined;

    // コストログDB書き込み（全環境）
    logApiCost("memory_compress", HAIKU_MODEL, response.usage.input_tokens, response.usage.output_tokens, cache.read, cache.write);

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // JSON抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("圧縮記憶: JSONが見つかりません", text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const memory: CompressedMemory = {
      keyTraits: (parsed.keyTraits || []).slice(0, 5),
      successPatterns: (parsed.successPatterns || []).slice(0, 5),
      failurePatterns: (parsed.failurePatterns || []).slice(0, 3),
      importantContext: (parsed.importantContext || []).slice(0, 3),
      lastConsulted: new Date().toISOString(),
      consultCount: logs.length,
    };

    return { memory, costInfo };
  } catch (error) {
    console.error("圧縮記憶生成エラー:", error);
    return null;
  }
}
