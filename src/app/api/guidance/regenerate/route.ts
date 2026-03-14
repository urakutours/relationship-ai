// POST /api/guidance/regenerate
// 指定タイプのガイダンスキャッシュを削除して再生成
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcDivinationProfile } from "@/lib/divination";
import { generateMonthlyGuidance, generateWeeklyGuidance } from "@/lib/ai/sonnet";
import {
  getISOWeekKey,
  getMonthKey,
  formatWeekRange,
} from "@/lib/date-utils";

/** 文字列からJSONオブジェクトを安全にパースする（コードフェンス対応） */
function safeParseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { /* fall through */ }
  const stripped = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("JSON not found in response");
}

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();

    if (type !== "weekly" && type !== "monthly") {
      return NextResponse.json(
        { error: "typeは 'weekly' または 'monthly' を指定してください" },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodKey = type === "monthly" ? getMonthKey(now) : getISOWeekKey(now);

    // 既存キャッシュ削除
    await prisma.guidanceCache.deleteMany({
      where: { type, periodKey },
    });

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

    const profileData = {
      nickname: userProfile.nickname,
      mbti: userProfile.mbti,
      gender: userProfile.gender,
      memoTags: userProfile.memoTags
        ? (JSON.parse(userProfile.memoTags) as string[])
        : [],
    };

    let result;

    if (type === "monthly") {
      result = await generateMonthlyGuidance(profileData, div, periodKey);
    } else {
      // 月次キャッシュをコンテキストとして取得
      const monthKey = getMonthKey(now);
      const monthlyCache = await prisma.guidanceCache.findUnique({
        where: { type_periodKey: { type: "monthly", periodKey: monthKey } },
      });
      const weekRangeStr = formatWeekRange(now);
      result = await generateWeeklyGuidance(
        profileData,
        div,
        periodKey,
        weekRangeStr,
        monthlyCache?.content ?? null
      );
    }

    // JSONパース → クリーンなJSON文字列をDBに保存
    const guidance = safeParseJson(result.content);
    const cleanJson = JSON.stringify(guidance);

    await prisma.guidanceCache.create({
      data: {
        type,
        periodKey,
        content: cleanJson,
      },
    });

    return NextResponse.json({
      guidance,
      periodKey,
      ...(type === "weekly" ? { weekRange: formatWeekRange(now) } : {}),
      generatedAt: new Date().toISOString(),
      fromCache: false,
      model: "claude-sonnet-4-6",
      ...(process.env.NODE_ENV === "development" && result.costInfo
        ? { costInfo: result.costInfo }
        : {}),
    });
  } catch (error) {
    console.error("ガイダンス再生成エラー:", error);
    return NextResponse.json(
      { error: "ガイダンスの再生成に失敗しました" },
      { status: 500 }
    );
  }
}
