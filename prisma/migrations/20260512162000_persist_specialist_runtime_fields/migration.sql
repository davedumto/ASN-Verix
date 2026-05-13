-- Add runtime fields required to persist dynamically registered specialists.
ALTER TABLE "Specialist" ADD COLUMN "aiModel" TEXT DEFAULT 'openai';
ALTER TABLE "Specialist" ADD COLUMN "apiKey" TEXT;
ALTER TABLE "Specialist" ADD COLUMN "apiKeyMasked" TEXT;
