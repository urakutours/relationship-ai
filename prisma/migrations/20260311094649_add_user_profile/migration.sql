-- CreateTable
CREATE TABLE "UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "nickname" TEXT NOT NULL DEFAULT '自分',
    "birthDate" TEXT,
    "birthYear" INTEGER,
    "gender" TEXT,
    "bloodType" TEXT,
    "birthOrder" TEXT,
    "birthCountry" TEXT DEFAULT 'JP',
    "mbti" TEXT,
    "memoTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
