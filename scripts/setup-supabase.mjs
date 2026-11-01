import { readFileSync } from 'node:fs';
import pg from 'pg';
if (!process.env.SUPABASE_DATABASE_URL) throw new Error('Set SUPABASE_DATABASE_URL in .env.local first');
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
 await client.query('BEGIN');
 await client.query(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
 await client.query('COMMIT');
 console.log('Supabase schema ready.');
} catch (error) {
 await client.query('ROLLBACK');
 console.error('Supabase setup failed:', error.code || error.name);
 process.exitCode = 1;
} finally { client.release(); await pool.end(); }
