// Anthropicクライアント共通モジュール
// Claude Codeがプロセス環境変数を空文字で上書きする場合の
// .env.localフォールバック読み込みに対応

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

// APIキーのキャッシュ
let cachedApiKey: string | null = null;

/**
 * APIキーを取得する
 * process.envが空の場合、.env.localから直接読み込む
 */
function getApiKey(): string {
  if (cachedApiKey) return cachedApiKey;

  // まずprocess.envから取得
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    cachedApiKey = envKey;
    return envKey;
  }

  // .env.localからフォールバック読み込み
  try {
    const envLocal = readFileSync(
      join(process.cwd(), ".env.local"),
      "utf-8"
    );
    const match = envLocal.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) {
      cachedApiKey = match[1].trim();
      return cachedApiKey;
    }
  } catch {
    // ファイルが存在しない場合は無視
  }

  throw new Error(
    "ANTHROPIC_API_KEYが設定されていません。.env.localに設定してください。"
  );
}

// Anthropicクライアント（シングルトン）
let client: Anthropic | null = null;

/**
 * Anthropicクライアントを取得する（シングルトン）
 */
export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: getApiKey(),
    });
  }
  return client;
}
