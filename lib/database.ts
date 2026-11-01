import { Pool, types, type PoolClient } from "pg";
// All bigint columns are constrained to JS-safe integers or epoch milliseconds.
types.setTypeParser(20, Number);
type Row = Record<string, any>;
type Statement = { get(...values: any[]): Promise<Row | undefined> | Row | undefined; all(...values: any[]): Promise<Row[]> | Row[]; run(...values: any[]): unknown };
export type Store = { prepare(sql: string): Statement; transaction(work: (db: Store) => Promise<void>): Promise<void> };
let pool: Pool | undefined;
function postgres(client: Pool | PoolClient): Store {
  return {
    prepare(sql) {
      let index = 0;
      let query = sql.replace(/\?/g, () => `$${++index}`)
        .replace(/\b(accounts|sessions|tasks|login_attempts)\b/g, 'teamflow.$1')
        .replace(/\buser\b/g, '"user"');
      if (query.includes("INSERT OR IGNORE")) query = query.replace("INSERT OR IGNORE", "INSERT") + " ON CONFLICT DO NOTHING";
      // Qualify the existing row in the rate-limit upsert.
      query = query.replace("failures=failures+1", "failures=teamflow.login_attempts.failures+1");
      return {
        get: async (...values) => (await client.query(query, values)).rows[0],
        all: async (...values) => (await client.query(query, values)).rows,
        run: async (...values) => { await client.query(query, values); },
      };
    },
    async transaction(work) {
      const connection = await (client as Pool).connect();
      try {
        await connection.query("BEGIN");
        await work(postgres(connection));
        await connection.query("COMMIT");
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally { connection.release(); }
    },
  };
}
export async function getDatabase(): Promise<Store> {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  if (connectionString) {
    if (!pool) {
      pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
      pool.on("error", () => console.error("Supabase database connection interrupted"));
    }
    return postgres(pool);
  }
  if (process.env.VERCEL) throw new Error("Set SUPABASE_DATABASE_URL before deploying to Vercel");
  const db = (await import("./sqlite")).getDatabase();
  const adapter: Store = {
    prepare: (sql) => db.prepare(sql),
    async transaction(work) {
      db.exec("BEGIN IMMEDIATE");
      try { await work(adapter); db.exec("COMMIT"); }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  };
  return adapter;
}
