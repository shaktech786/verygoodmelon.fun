import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration(migrationPath: string) {
  console.log(`\n🔄 Running migration: ${path.basename(migrationPath)}`)

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split by semicolons and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`   Found ${statements.length} SQL statements`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`   Executing statement ${i + 1}/${statements.length}...`)

    const { error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      console.error(`   ❌ Error executing statement ${i + 1}:`, error)
      // Try direct execution as fallback
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql: statement })
        })

        if (!response.ok) {
          const errorData = await response.text()
          console.error(`   ❌ HTTP Error:`, errorData)
        }
      } catch (fetchError) {
        console.error(`   ❌ Fallback failed:`, fetchError)
      }
    } else {
      console.log(`   ✅ Statement ${i + 1} executed successfully`)
    }
  }
}

async function main() {
  console.log('🚀 Starting database migrations...\n')

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir)
    process.exit(1)
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found')
    process.exit(0)
  }

  console.log(`Found ${migrationFiles.length} migration file(s):\n`)
  migrationFiles.forEach(f => console.log(`   - ${f}`))

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file)
    await runMigration(migrationPath)
  }

  console.log('\n✅ All migrations completed!\n')
}

main().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
