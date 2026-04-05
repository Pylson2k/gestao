-- =============================================================================
-- Listas de materiais (tabelas novas) — execute no PostgreSQL / Neon se não
-- puder rodar "npm run db:sync" na máquina.
-- Neon: Dashboard do projeto → SQL Editor → colar este arquivo → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS "material_lists" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT,
    "observations" TEXT,
    "includePrices" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_lists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "material_lists_number_key" ON "material_lists"("number");

CREATE INDEX IF NOT EXISTS "material_lists_userId_createdAt_idx" ON "material_lists"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "material_list_items" (
    "id" TEXT NOT NULL,
    "materialListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "material_list_items_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_lists_userId_fkey'
  ) THEN
    ALTER TABLE "material_lists" ADD CONSTRAINT "material_lists_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_lists_clientId_fkey'
  ) THEN
    ALTER TABLE "material_lists" ADD CONSTRAINT "material_lists_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'material_list_items_materialListId_fkey'
  ) THEN
    ALTER TABLE "material_list_items" ADD CONSTRAINT "material_list_items_materialListId_fkey"
      FOREIGN KEY ("materialListId") REFERENCES "material_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
