// 自分のプロフィール API ルート（GET / POST upsert）
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// プロフィール取得（未登録ならデフォルト値を返す）
export async function GET() {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: 1 },
    });

    if (!profile) {
      // 未登録時はデフォルト値を返す（DBには書き込まない）
      return NextResponse.json({
        id: 1,
        nickname: "自分",
        birthDate: null,
        birthYear: null,
        gender: null,
        bloodType: null,
        birthOrder: null,
        birthCountry: "JP",
        mbti: null,
        memoTags: "[]",
        exists: false, // フロントで未登録を判定するフラグ
      });
    }

    return NextResponse.json({ ...profile, exists: true });
  } catch (error) {
    console.error("プロフィール取得エラー:", error);
    return NextResponse.json(
      { error: "プロフィールの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// プロフィール登録・更新（upsert）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nickname,
      birthDate,
      birthYear,
      gender,
      bloodType,
      birthOrder,
      birthCountry,
      mbti,
      memoTags,
    } = body;

    if (!nickname || !nickname.trim()) {
      return NextResponse.json(
        { error: "ニックネームは必須です" },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.upsert({
      where: { id: 1 },
      update: {
        nickname: nickname.trim(),
        birthDate: birthDate || null,
        birthYear: birthYear ? parseInt(String(birthYear), 10) : null,
        gender: gender || null,
        bloodType: bloodType || null,
        birthOrder: birthOrder || null,
        birthCountry: birthCountry || null,
        mbti: mbti ? mbti.trim().toUpperCase() : null,
        memoTags: Array.isArray(memoTags)
          ? JSON.stringify(memoTags.filter((t: string) => t.trim()))
          : memoTags || "[]",
      },
      create: {
        id: 1,
        nickname: nickname.trim(),
        birthDate: birthDate || null,
        birthYear: birthYear ? parseInt(String(birthYear), 10) : null,
        gender: gender || null,
        bloodType: bloodType || null,
        birthOrder: birthOrder || null,
        birthCountry: birthCountry || null,
        mbti: mbti ? mbti.trim().toUpperCase() : null,
        memoTags: Array.isArray(memoTags)
          ? JSON.stringify(memoTags.filter((t: string) => t.trim()))
          : memoTags || "[]",
      },
    });

    // 保存成功後にバックグラウンドで分析を開始
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/profile/analyze`, { method: "POST" })
      .catch((err) => console.error("バックグラウンドプロフィール分析エラー:", err));

    return NextResponse.json({ ...profile, exists: true });
  } catch (error) {
    console.error("プロフィール保存エラー:", error);
    return NextResponse.json(
      { error: "プロフィールの保存に失敗しました" },
      { status: 500 }
    );
  }
}
