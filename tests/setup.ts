/**
 * Test setup file
 * Loads environment variables for integration tests
 */

import { config } from 'dotenv'
import path from 'path'

// Load .env.local for integration tests
config({ path: path.resolve(process.cwd(), '.env.local') })

// Ensure required environment variables are present for integration tests
const requiredEnvVars = ['GOOGLE_GEMINI_API_KEY']

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} not set. Integration tests may fail.`)
  }
}
