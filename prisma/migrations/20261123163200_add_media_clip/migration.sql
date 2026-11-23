-- CreateTable
CREATE TABLE "MediaClip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaAssetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startSec" INTEGER NOT NULL DEFAULT 0,
    "endSec" INTEGER NOT NULL,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "outputStorageKey" TEXT,
    "outputUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaClip_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
