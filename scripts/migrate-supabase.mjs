// Copy existing local data without overwriting rows already present in Supabase.
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import pg from 'pg';
if (!process.env.SUPABASE_DATABASE_URL) throw new Error('Set SUPABASE_DATABASE_URL first');
const source = new DatabaseSync(resolve(process.env.DATABASE_PATH || './data/teamflow.sqlite'), { readOnly: true });
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
 await client.query('BEGIN');
 const accounts = source.prepare('SELECT * FROM accounts').all();
 for (const row of accounts) await client.query('INSERT INTO teamflow.accounts(id,password) VALUES($1,$2) ON CONFLICT DO NOTHING', [row.id,row.password]);
 const tasks = source.prepare('SELECT * FROM tasks').all();
 const inserted = new Set();
 // Insert all tasks first, then link their parents (arbitrary nesting/order).
 for (const row of tasks) {
  const columns = ['id','title','content','department','assignee','creator','deadline','progress','priority','note','updated','completed_quantity'];
  const result = await client.query(`INSERT INTO teamflow.tasks(${columns.join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING RETURNING id`, columns.map(c=>row[c] ?? null));
  if (result.rows.length) inserted.add(row.id);
 }
 for (const row of tasks.filter(t=>t.parent && inserted.has(t.id))) {
  await client.query('UPDATE teamflow.tasks SET parent=$1 WHERE id=$2', [row.parent,row.id]);
 }
 await client.query('COMMIT');
 console.log(`Migration complete: processed ${accounts.length} accounts and ${tasks.length} tasks. Existing rows were preserved. Sign in again on the new deployment.`);
} catch(error) {
 await client.query('ROLLBACK');
 console.error('Migration failed:',error.code || error.name);
 process.exitCode=1;
} finally { source.close();client.release();await pool.end(); }
