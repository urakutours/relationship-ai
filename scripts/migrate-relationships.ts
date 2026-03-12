/**
 * 既存の関係性データを新しい2階層構造に移行するスクリプト
 *
 * 使い方: npx tsx scripts/migrate-relationships.ts
 *
 * マッピング:
 *   "上司"       → category: "workplace", subtype: "boss"
 *   "部下"       → category: "workplace", subtype: "subordinate"
 *   "配偶者"     → category: "romantic",  subtype: "spouse"
 *   "クライアント" → category: "workplace", subtype: "client"
 *   "友人"       → category: "friend",    subtype: "friend"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEGACY_MAP: Record<string, { category: string; subtype: string }> = {
  "上司": { category: "workplace", subtype: "boss" },
  "部下": { category: "workplace", subtype: "subordinate" },
  "配偶者": { category: "romantic", subtype: "spouse" },
  "クライアント": { category: "workplace", subtype: "client" },
  "友人": { category: "friend", subtype: "friend" },
};

async function main() {
  const persons = await prisma.person.findMany({
    where: { relationshipCategory: null },
  });

  console.log(`移行対象: ${persons.length}件`);

  for (const person of persons) {
    const mapping = LEGACY_MAP[person.relationship];
    if (mapping) {
      await prisma.person.update({
        where: { id: person.id },
        data: {
          relationshipCategory: mapping.category,
          relationshipSubtype: mapping.subtype,
        },
      });
      console.log(`✓ ${person.nickname}: "${person.relationship}" → ${mapping.category}/${mapping.subtype}`);
    } else {
      // マッピングにない場合は「その他」に分類
      await prisma.person.update({
        where: { id: person.id },
        data: {
          relationshipCategory: "other",
          relationshipSubtype: "other",
        },
      });
      console.log(`✓ ${person.nickname}: "${person.relationship}" → other/other`);
    }
  }

  console.log("移行完了");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
