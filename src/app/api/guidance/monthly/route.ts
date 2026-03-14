// GET /api/guidance/monthly
// Sonnet で月次ガイダンスを生成・キャッシュ
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcDivinationProfile } from "@/lib/divination";
import { generateMonthlyGuidance } from "@/lib/ai/sonnet";
import { getMonthKey } from "@/lib/date-utils";

/** 文字列からJSONオブジェクトを安全にパースする（コードフェンス対応） */
function safeParseJson(raw: string): Record<string, unknown> {
  // まず直接パースを試行
  try { return JSON.parse(raw); } catch { /* fall through */ }
  // コードフェンスを除去してJSON抽出
  const stripped = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("JSON not found in response");
}

export async function GET() {
  try {
    const monthKey = getMonthKey(new Date());

    // キャッシュチェック
    const cached = await prisma.guidanceCache.findUnique({
      where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
    });

    if (cached) {
      return NextResponse.json({
        guidance: safeParseJson(cached.content),
        periodKey: monthKey,
        generatedAt: cached.generatedAt.toISOString(),
        fromCache: true,
        model: "claude-sonnet-4-6",
      });
    }

    // ユーザープロフィール取得
    const userProfile = await prisma.userProfile.findUnique({ where: { id: 1 } });
    if (!userProfile) {
      return NextResponse.json(
        { error: "プロフィールが登録されていません" },
        { status: 404 }
      );
    }

    // 占術計算
    const div = calcDivinationProfile({
      birthDate: userProfile.birthDate,
      birthYear: userProfile.birthYear,
    });

    // Sonnet で生成
    const result = await generateMonthlyGuidance(
      {
        nickname: userProfile.nickname,
        mbti: userProfile.mbti,
        gender: userProfile.gender,
        memoTags: userProfile.memoTags
          ? (JSON.parse(userProfile.memoTags) as string[])
          : [],
      },
      div,
      monthKey
    );

    // JSONパース → クリーンなJSON文字列をDBに保存
    const guidance = safeParseJson(result.content);
    const cleanJson = JSON.stringify(guidance);

    await prisma.guidanceCache.create({
      data: {
        type: "monthly",
        periodKey: monthKey,
        content: cleanJson,
      },
    });

    return NextResponse.json({
      guidance,
      periodKey: monthKey,
      generatedAt: new Date().toISOString(),
      fromCache: false,
      model: "claude-sonnet-4-6",
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("月次ガイダンス生成エラー:", error);
    return NextResponse.json(
      { error: "月次ガイダンスの生成に失敗しました" },
      { status: 500 }
    );
  }
}
