-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "relationshipCategory" TEXT,
    "relationshipSubtype" TEXT,
    "relationshipDetail" TEXT,
    "birthDate" TEXT,
    "birthYear" INTEGER,
    "gender" TEXT,
    "bloodType" TEXT,
    "honorific" TEXT,
    "birthCountry" TEXT,
    "birthOrder" TEXT,
    "personalContext" TEXT,
    "acquaintanceDate" TEXT,
    "intimacyScore" INTEGER DEFAULT 5,
    "contactFrequency" TEXT,
    "mbti" TEXT,
    "maritalStatus" TEXT,
    "hasChildren" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quickNote" TEXT,
    "deepNote" TEXT,
    "compatibilityScore" INTEGER,
    "quickNoteUpdatedAt" TIMESTAMP(3),
    "deepNoteUpdatedAt" TIMESTAMP(3),
    "sortOrder" INTEGER,
    "compressedMemory" TEXT,
    "memoryUpdatedAt" TIMESTAMP(3),
    "consultCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationLog" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "consultType" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "outcome" TEXT,
    "outcomeRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nickname" TEXT NOT NULL DEFAULT '自分',
    "birthDate" TEXT,
    "birthYear" INTEGER,
    "gender" TEXT,
    "bloodType" TEXT,
    "birthOrder" TEXT,
    "birthCountry" TEXT DEFAULT 'JP',
    "mbti" TEXT,
    "memoTags" TEXT,
    "quickNote" TEXT,
    "deepNote" TEXT,
    "quickNoteUpdatedAt" TIMESTAMP(3),
    "deepNoteUpdatedAt" TIMESTAMP(3),
    "profileAnalysis" TEXT,
    "profileAnalysisUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT DEFAULT 'other',
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7ec8c0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonLabel" (
    "personId" TEXT NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "PersonLabel_pkey" PRIMARY KEY ("personId","labelId")
);

-- CreateTable
CREATE TABLE "GuidanceCache" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidanceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCostLog" (
    "id" SERIAL NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "costUSD" DOUBLE PRECISION NOT NULL,
    "costJPY" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuidanceCache_type_periodKey_key" ON "GuidanceCache"("type", "periodKey");

-- AddForeignKey
ALTER TABLE "ConsultationLog" ADD CONSTRAINT "ConsultationLog_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonLabel" ADD CONSTRAINT "PersonLabel_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonLabel" ADD CONSTRAINT "PersonLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
