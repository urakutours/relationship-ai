"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "認証に失敗しました");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-gold tracking-wide">
            RelationshipAI
          </h1>
          <p className="text-text-muted text-sm mt-2">Beta Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="w-full px-4 py-3 bg-surface border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-gold/10 border border-gold-dim text-gold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display tracking-wide"
          >
            {loading ? "認証中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
