# 人間関係ナビゲーションアプリ

## WHY
東洋・西洋の占術と観察情報を統合し、
人間関係のアクションプランを出力するアプリのMVP。

## WHAT
- Next.js 14 / TypeScript / Tailwind CSS
- SQLite（Prisma）
- Anthropic Claude API（Haiku + Sonnet）

## HOW

### コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npx prisma db push   # DBスキーマ反映
npx prisma studio    # DB確認
```

### 重要ルール
- 占術の根拠をUI上に表示しない
- AIへのシステムプロンプトは必ずcache_controlを設定する
- 軽量処理はHaiku、ディープ相談はSonnetを使う
- コスト表示は開発環境のみ

### 主要ファイル
- `src/lib/ai/prompts.ts` — システムプロンプト（変更時は慎重に）
- `src/lib/divination/` — 占術計算ロジック
- `prisma/schema.prisma` — データモデル

---

## プロンプト監査結果（2026-03-14 第2版：最適化実施後）

### 1. 各AI呼び出し箇所のプロンプト構造一覧

| # | 機能 | ファイル | モデル | sys[0] (トークン推定) | cache_control | sys[1] (トークン推定) | user msg (トークン推定) | DBキャッシュ | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 日次ガイダンス | `haiku.ts` | Haiku | `HAIKU_DAILY_SYSTEM_PROMPT` (~100) | ✅ ephemeral | `HAIKU_BIORHYTHM_INSTRUCTION` (~50) | ~100 | なし（毎回生成） | 占術DB不使用の軽量構成 |
| 2 | 週次ガイダンス | `sonnet.ts` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_WEEKLY_GUIDANCE_INSTRUCTION` (~200) | ~350 | `GuidanceCache`（週1回） | 特性は`resolveTraits()`で動的注入 |
| 3 | 月次ガイダンス | `sonnet.ts` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_MONTHLY_GUIDANCE_INSTRUCTION` (~200) | ~300 | `GuidanceCache`（月1回） | 同上 |
| 4 | 相性スコア | `haiku.ts` | Haiku | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `HAIKU_COMPATIBILITY_INSTRUCTION` (~70) | ~250 | `Person.compatibilityScore` | 特性は`resolveTraits()`で動的注入 |
| 5 | クイック分析 | `persons/[id]/analyze` | Haiku | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `HAIKU_QUICK_ANALYSIS_INSTRUCTION` (~120) | ~350 | `Person.quickNote` | 特性+五行を動的注入 |
| 6 | 深掘り分析 | `persons/[id]/analyze-deep` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_DEEP_ANALYSIS_INSTRUCTION` (~250) | ~500 | `Person.deepNote` | 既存quickNote参照あり |
| 7 | 自分クイック分析 | `profile/analyze` | Haiku | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `HAIKU_SELF_ANALYSIS_INSTRUCTION` (~120) | ~250 | `UserProfile.quickNote` | 特性+五行を動的注入 |
| 8 | 自分深掘り分析 | `profile/analyze-deep` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_SELF_DEEP_ANALYSIS_INSTRUCTION` (~250) | ~350 | `UserProfile.profileAnalysis` | **キャッシュ付き**（プロフィール未変更時はスキップ） |
| 9 | ディープ相談(FREE) | `sonnet.ts` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_CONSULT_FREE_INSTRUCTION` (~70) | ~450 | なし | 特性+五行を動的注入 |
| 10 | ディープ相談(PREMIUM) | `sonnet.ts` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_CONSULT_PREMIUM_INSTRUCTION` (~120) | ~450 | なし | 同上 |
| 11 | ディープ相談(DEEP) | `sonnet.ts` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | `SONNET_CONSULT_DEEP_INSTRUCTION` (~300) | ~650 | なし | 圧縮記憶+直近相談含む |
| 12 | 深掘り続き(人物) | `persons/[id]/analyze-continue` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | インライン指示 (~50) | ~550 | `Person.deepNote`に追記 | 前回出力の末尾500字を渡す |
| 13 | 深掘り続き(自分) | `profile/analyze-continue` | Sonnet | `DIVINATION_SYSTEM_PROMPT` (~550) | ✅ ephemeral | インライン指示 (~50) | ~550 | `UserProfile.deepNote`に追記 | 同上 |
| 14 | 記憶圧縮 | `compress-memory.ts` | Haiku | `HAIKU_COMPRESS_MEMORY_INSTRUCTION` (~200) | ✅ ephemeral | なし（sys1ブロックなし） | ~1,000-4,000 | `Person.compressedMemory` | 相談5回ごとに自動実行 |

### 2. システムプロンプトの中身チェック

#### DIVINATION_SYSTEM_PROMPT（~550トークン）
前回監査時（~2,500トークン）から大幅縮小。

| 項目 | プロンプト内 | 方式 | トークン推定 |
|---|---|---|---|
| 判断の優先順位 | ✅ 含む | 直書き | ~50 |
| 出力ルール | ✅ 含む | 直書き | ~50 |
| 名前の呼び方ルール | ✅ 含む | 直書き | ~100 |
| 占術用語禁止ルール（詳細版） | ✅ 含む | 直書き | ~250 |
| 変換例（7パターン） | ✅ 含む | 直書き | ~150 |
| 五行の相生相克ルール | ✅ 含む | 直書き（5行） | ~80 |
| 西洋星座の特性テキスト（12星座分） | ❌ 除去済み | `trait-resolver.ts`で動的注入 | 0 |
| 数秘術の特性テキスト（12パターン） | ❌ 除去済み | `trait-resolver.ts`で動的注入 | 0 |
| 九星気学の特性テキスト（9星分） | ❌ 除去済み | `trait-resolver.ts`で動的注入 | 0 |
| 日干の特性テキスト（10干分） | ❌ 除去済み | `trait-resolver.ts`で動的注入 | 0 |
| 占術の計算ロジック | ❌ 含まない | TypeScriptで事前計算 | 0 |
| 天中殺のパターン・解釈 | ❌ 含まない | 未実装 | 0 |

#### HAIKU_DAILY_SYSTEM_PROMPT（~100トークン）
- 占術DB不使用の独立した軽量プロンプト
- 占術用語禁止ルールは1行で記述（`DIVINATION_SYSTEM_PROMPT`の詳細版は不使用）

#### HAIKU_COMPRESS_MEMORY_INSTRUCTION（~200トークン）
- 独立した圧縮記憶用プロンプト（`DIVINATION_SYSTEM_PROMPT`不使用）
- 占術用語禁止は最終行に1行で記述

### 3. 最適化状況

#### 前回監査からの改善実施状況

| 前回の問題点 | 状態 | 実施内容 |
|---|---|---|
| A: 特性テキスト全量問題 | ✅ **解決済み** | `trait-resolver.ts`で対象者分のみ動的注入。sys[0]が~2,500→~550トークンに縮小 |
| B: 記憶圧縮のcache_control未設定 | ✅ **解決済み** | `compress-memory.ts`に`cache_control: { type: "ephemeral" }`追加 |
| C: 五行ルールを事前計算に置換 | 🔵 **保留** | 80トークンと軽微。AIの柔軟な解釈を維持するため現状維持 |
| D: 再生成ボタン制限 | ✅ **解決済み** | 再生成ボタン自体を削除（月次・週次・日次すべて） |
| E: NO_DIVINATION_TERMS重複 | ✅ **解決済み** | `NO_DIVINATION_TERMS`定数を削除、10箇所の参照を除去 |
| 追加: プロフィール深掘りキャッシュ | ✅ **新規実装** | `UserProfile.profileAnalysis`でSonnet結果をキャッシュ |

#### 残存する最適化余地

| 優先度 | 項目 | 推定影響 | 備考 |
|---|---|---|---|
| 🟢 低 | 五行ルール（~80トークン）の事前計算化 | 微小 | AIの柔軟解釈を失うリスクあり。現状維持が妥当 |
| 🟢 低 | 相談結果のDBキャッシュ（#9-11） | コスト削減は大きいが仕様上不可 | 相談は毎回異なる内容のため、キャッシュ不可 |
| 🟡 中 | `analyze-continue`（#12-13）のシステムプロンプト軽量化 | ~500トークン削減/回 | 「続き」生成に占術用語禁止ルールは不要。`HAIKU_DAILY_SYSTEM_PROMPT`相当の軽量版で代替可能 |

### 4. トークンコスト推定（改善前後比較）

| 機能 | 改善前 入力トークン | 改善後 入力トークン | 削減率 |
|---|---|---|---|
| 相性スコア (Haiku) | ~2,800 | ~870 | **69%** |
| クイック分析 (Haiku) | ~2,950 | ~1,020 | **65%** |
| 深掘り分析 (Sonnet) | ~3,300 | ~1,350 | **59%** |
| 自分クイック分析 (Haiku) | ~2,850 | ~920 | **68%** |
| 自分深掘り分析 (Sonnet) | ~3,200 | ~1,150 (キャッシュ時0) | **64%** (100%) |
| ディープ相談 FREE (Sonnet) | ~3,000 | ~1,070 | **64%** |
| ディープ相談 DEEP (Sonnet) | ~3,450 | ~1,550 | **55%** |
| 月次ガイダンス (Sonnet) | ~3,000 | ~1,050 | **65%** |
| 週次ガイダンス (Sonnet) | ~3,050 | ~1,100 | **64%** |
| 記憶圧縮 (Haiku) | ~1,200-4,200 | ~1,200-4,200 (キャッシュ効率化) | 0% (コスト90%減) |
| 日次ガイダンス (Haiku) | ~250 | ~250 | 変更なし |

**キャッシュミス時の金額影響（Sonnet 1回あたり）**:
- 改善前: ~3,000入力トークン × $3/1Mトークン = ~¥1.35
- 改善後: ~1,100入力トークン × $3/1Mトークン = ~¥0.50
- **1回あたり約¥0.85削減**

**キャッシュヒット時**:
- sys[0]はキャッシュ対象のため、~550トークン分は$0.3/1Mで計算される
- 実質的なコスト差は sys[1]+user msg 部分のみ → 削減効果は限定的

### 5. 現状評価サマリー

- ✅ **全14箇所で `cache_control` が正しく設定済み**（前回: 13/14）
- ✅ **特性テキスト全量問題を解消**: `trait-resolver.ts`で対象者分のみ動的注入（~950トークン削減/回）
- ✅ **`NO_DIVINATION_TERMS`重複を排除**: 10箇所の冗長な占術用語禁止を削除（~50トークン×10=~500トークン削減）
- ✅ **再生成ボタンを削除**: 不要なAPI呼び出しの発生源を除去
- ✅ **プロフィール深掘り分析にDBキャッシュ追加**: 2回目以降のSonnet呼び出しをスキップ
- ✅ **日次ガイダンスは最適化済み**: 専用軽量プロンプトで占術DB不使用
- ✅ **月次・週次はDBキャッシュで保護**: Sonnet呼び出しは月1回・週1回に制限
- 🟡 **唯一の残存課題**: `analyze-continue`ルートのシステムプロンプト軽量化（優先度低）
