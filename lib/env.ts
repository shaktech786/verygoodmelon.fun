import { z } from 'zod'

const envSchema = z.object({
  // Required
  GOOGLE_GEMINI_API_KEY: z.string().min(1, 'GOOGLE_GEMINI_API_KEY is required'),

  // Optional with defaults
  GOOGLE_GEMINI_MODEL: z.string().default('gemini-2.0-flash'),

  // Optional
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env

  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const missing = result.error.issues
      .filter((issue) => issue.code === 'too_small' || issue.code === 'invalid_type')
      .map((issue) => issue.path.join('.'))

    if (missing.length > 0) {
      console.warn(
        `[env] Missing required environment variables: ${missing.join(', ')}`
      )
    }

    // Fall back to raw process.env cast so the app doesn't crash
    // for missing optional vars during build or dev
    _env = envSchema
      .partial()
      .extend({ GOOGLE_GEMINI_API_KEY: z.string().default('') })
      .parse(process.env) as Env
    return _env
  }

  _env = result.data
  return _env
}
