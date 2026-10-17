import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';

const schema = `
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT,firebase_id TEXT UNIQUE,avatar TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,saved TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS follows(actor TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,target TEXT NOT NULL,PRIMARY KEY(actor,target));
CREATE INDEX IF NOT EXISTS follows_target ON follows(target);
CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,only_admin INTEGER NOT NULL DEFAULT 0,icon TEXT,icon_mime TEXT);
CREATE TABLE IF NOT EXISTS members(conversation TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL DEFAULT 'member',read_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(conversation,user_id));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,conversation TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,sender TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL DEFAULT '',type TEXT NOT NULL DEFAULT 'text',file TEXT,mime TEXT,filename TEXT,reply_to TEXT,created INTEGER NOT NULL,edited INTEGER,deleted INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages(conversation,created);
CREATE TABLE IF NOT EXISTS reactions(message TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,emoji TEXT NOT NULL,PRIMARY KEY(message,user_id));
CREATE TABLE IF NOT EXISTS news_likes(news TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(news,user_id));`;

const tables = ['users','sessions','follows','conversations','members','messages','reactions','news_likes'];
function postgresSQL(sql) {
  let n = 0;
  // SQL strings are fixed in the server. Values always travel separately as parameters.
  return sql.replace(/'(?:''|[^'])*'|\?|\browid\b|\b(?:users|sessions|follows|conversations|members|messages|reactions|news_likes)\b/g, token => {
    if (token.startsWith("'")) return token;
    if (token === '?') return '$' + ++n;
    if (token === 'rowid') return 'xp_sequence';
    return 'xpedition.' + token;
  });
}

export async function openDatabase(dataDir) {
  if (!process.env.DATABASE_URL) {
    if (process.env.PERSISTENCE_MODE === 'supabase') throw new Error('Falta DATABASE_URL. Configura la conexión Session pooler de Supabase.');
    fs.mkdirSync(dataDir, { recursive:true });
    const database = new DatabaseSync(path.join(dataDir, 'xpedition.sqlite'));
    database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;' + schema);
    const columns = new Set(database.prepare('PRAGMA table_info(conversations)').all().map(c=>c.name));
    for (const [name,type] of [['only_admin','INTEGER NOT NULL DEFAULT 0'],['icon','TEXT'],['icon_mime','TEXT']]) {
      if (!columns.has(name)) database.exec(`ALTER TABLE conversations ADD COLUMN ${name} ${type}`);
    }
    return {
      kind:'sqlite',
      one: async (sql,...args)=>database.prepare(sql).get(...args),
      all: async (sql,...args)=>database.prepare(sql).all(...args),
      run: async (sql,...args)=>database.prepare(sql).run(...args),
      transaction: async fn=>{ database.exec('BEGIN'); try { const value=await fn(); database.exec('COMMIT'); return value; } catch(e) { database.exec('ROLLBACK'); throw e; } },
      close: async ()=>database.close()
    };
  }
  const { default:pg } = await import('pg');
  const { Pool,types } = pg;
  types.setTypeParser(20, value => {
    const number=Number(value);
    if (!Number.isSafeInteger(number)) throw new Error('Valor numérico fuera de rango.');
    return number;
  });
  let connectionValue=process.env.DATABASE_URL;
  if(connectionValue.includes('[YOUR-PASSWORD]')) {
    if(!process.env.DATABASE_PASSWORD)throw new Error('Falta DATABASE_PASSWORD. Pega la contraseña de tu base de datos en Render.');
    connectionValue=connectionValue.replace('[YOUR-PASSWORD]',encodeURIComponent(process.env.DATABASE_PASSWORD));
  }
  const connection = new URL(connectionValue);
  const local = ['localhost','127.0.0.1','[::1]'].includes(connection.hostname);
  // Require verified TLS for remote databases. A project CA can be supplied if needed.
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) connection.searchParams.delete(key);
  const pool = new Pool({ connectionString:connection.href, max:3, connectionTimeoutMillis:15000,
    idleTimeoutMillis:30000, query_timeout:15000,
    ssl:local?false:{rejectUnauthorized:true,...(process.env.DATABASE_CA?{ca:process.env.DATABASE_CA.replace(/\\n/g,'\n')}:{})} });
  pool.on('error', error=>console.error('Conexión de base de datos interrumpida:',error.code||'DATABASE_ERROR'));
  const context = new AsyncLocalStorage();
  const query = (sql,args=[]) => (context.getStore()||pool).query(postgresSQL(sql),args);
  try {
    await pool.query('CREATE SCHEMA IF NOT EXISTS xpedition; REVOKE ALL ON SCHEMA xpedition FROM PUBLIC;');
    let pgSchema = schema.replace(/\bINTEGER\b/g,'BIGINT').replace('CREATE TABLE IF NOT EXISTS messages(', 'CREATE TABLE IF NOT EXISTS messages(xp_sequence BIGSERIAL UNIQUE,');
    // Index names are schema-qualified by PostgreSQL through their table.
    await pool.query(postgresSQL(pgSchema));
    for (const table of tables) await pool.query(`ALTER TABLE xpedition.${table} ENABLE ROW LEVEL SECURITY;`);
    await pool.query(`REVOKE ALL ON ALL TABLES IN SCHEMA xpedition FROM PUBLIC;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA xpedition FROM PUBLIC;
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
          REVOKE ALL ON SCHEMA xpedition FROM anon;
          REVOKE ALL ON ALL TABLES IN SCHEMA xpedition FROM anon;
          REVOKE ALL ON ALL SEQUENCES IN SCHEMA xpedition FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
          REVOKE ALL ON SCHEMA xpedition FROM authenticated;
          REVOKE ALL ON ALL TABLES IN SCHEMA xpedition FROM authenticated;
          REVOKE ALL ON ALL SEQUENCES IN SCHEMA xpedition FROM authenticated;
        END IF;
      END $$;`);
  } catch(error) { await pool.end(); throw error; }
  return {
    kind:'postgres',
    one: async (sql,...args)=>(await query(sql,args)).rows[0],
    all: async (sql,...args)=>(await query(sql,args)).rows,
    run: async (sql,...args)=>({changes:(await query(sql,args)).rowCount}),
    transaction: async fn=>{
      const client=await pool.connect();
      try { await client.query('BEGIN'); const value=await context.run(client,fn); await client.query('COMMIT'); return value; }
      catch(error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: ()=>pool.end()
  };
}
