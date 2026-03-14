import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const betaPassword = process.env.BETA_PASSWORD;
    if (!betaPassword) {
      // BETA_PASSWORDが未設定の場合は認証をスキップ（開発環境用）
      const response = NextResponse.json({ success: true });
      response.cookies.set("beta-auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30日間
        path: "/",
      });
      return response;
    }

    if (password !== betaPassword) {
      return NextResponse.json(
        { error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("beta-auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30日間
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "認証処理に失敗しました" },
      { status: 500 }
    );
  }
}
