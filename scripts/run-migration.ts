
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://guszkcxamkmrcoopturf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3prY3hhbWttcmNvb3B0dXJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEzNjM3NSwiZXhwIjoyMDc2NzEyMzc1fQ.crmntCZB0VGIXg8I4zPw46KEXMgqtCGWr8g7WyJRYEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  const filePath = path.join(process.cwd(), 'supabase', 'migrations', '20260220083500_create_sitewide_breaks.sql');
  const sql = fs.readFileSync(filePath, 'utf8');

  // Supabase JS client doesn't have a direct way to execute raw SQL scripts without a custom RPC function.
  // We need to check if there is an RPC function for executing raw SQL, or we have to use the Postgres connection string.
  
  console.log("Attempting to run SQL (not officially supported by default JS client without RPC):");
  console.log(sql.substring(0, 100) + '...');

  // This will likely fail unless the 'exec_sql' RPC exists, but it's worth trying if there's a custom one.
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Failed to run migration via RPC:', error);
    process.exit(1);
  }

  console.log('Migration applied successfully:', data);
}

applyMigration();
