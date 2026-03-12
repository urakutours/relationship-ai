// 敬称付き名前を返すユーティリティ

const ENDINGS = ["さん", "ちゃん", "くん", "様", "先生", "殿", "氏"];

/**
 * ニックネームに敬称を付けて返す
 * - honorific が指定されている場合はそれを使用
 * - 未指定の場合は「さん」を付ける
 * - 既に敬称で終わっている場合は付けない
 */
export function withHonorific(nickname: string, honorific?: string | null): string {
  const suffix = honorific || "さん";
  if (ENDINGS.some((e) => nickname.endsWith(e))) return nickname;
  return `${nickname}${suffix}`;
}
