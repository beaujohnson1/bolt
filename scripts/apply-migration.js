#!/usr/bin/env node
/**
 * Apply database migration for pricing tables
 * This script creates the missing pricing_recommendations and market_prices tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('🔍 [MIGRATION] Checking if tables exist...');
    
    // Check if pricing_recommendations table exists
    const { data: tables, error: tableError } = await supabase
      .from('pricing_recommendations')
      .select('id')
      .limit(1);
    
    if (!tableError) {
      console.log('✅ [MIGRATION] Tables already exist, skipping migration');
      return;
    }
    
    console.log('📊 [MIGRATION] Tables missing, reading migration file...');
    
    // Read the migration SQL
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250809000001_dynamic_pricing_agent.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 [MIGRATION] Applying database migration...');
    console.log('⚠️ [MIGRATION] Note: This requires database admin privileges');
    console.log('⚠️ [MIGRATION] If this fails, please run: npx supabase db push');
    
    // Split and execute SQL statements
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn('⚠️ [MIGRATION] Statement failed:', error.message);
          }
        } catch (err) {
          console.warn('⚠️ [MIGRATION] Statement execution error:', err.message);
        }
      }
    }
    
    console.log('✅ [MIGRATION] Migration application attempted');
    console.log('📝 [MIGRATION] Please verify tables were created in Supabase dashboard');
    
  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    console.log('💡 [MIGRATION] Alternative: Run "npx supabase db push" with proper credentials');
    process.exit(1);
  }
}

applyMigration();