import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'

// Load from .env.local (Next.js convention)
dotenv.config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DATABASE_URL is required for migrations (prisma db push / migrate).
    // For client generation only (prisma generate), it can be absent.
    url: process.env.DATABASE_URL ?? '',
  },
})
