import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';

const schema = `
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT,firebase_id TEXT UNIQUE,avatar TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,saved TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS push_configuration(name TEXT PRIMARY KEY,public_key TEXT NOT NULL,private_key TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions(endpoint_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_token TEXT NOT NULL REFERENCES sessions(token) ON DELETE CASCADE,subscription TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS push_subscriptions_user ON push_subscriptions(user_id);
CREATE TABLE IF NOT EXISTS follows(actor TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,target TEXT NOT NULL,PRIMARY KEY(actor,target));
CREATE INDEX IF NOT EXISTS follows_target ON follows(target);
CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,only_admin INTEGER NOT NULL DEFAULT 0,icon TEXT,icon_mime TEXT);
CREATE TABLE IF NOT EXISTS members(conversation TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL DEFAULT 'member',read_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(conversation,user_id));
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,conversation TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,sender TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL DEFAULT '',type TEXT NOT NULL DEFAULT 'text',file TEXT,mime TEXT,filename TEXT,reply_to TEXT,created INTEGER NOT NULL,edited INTEGER,deleted INTEGER NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS messages_conversation_time ON messages(conversation,created);
CREATE TABLE IF NOT EXISTS reactions(message TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,emoji TEXT NOT NULL,PRIMARY KEY(message,user_id));
CREATE TABLE IF NOT EXISTS news_likes(news TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(news,user_id));
CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,author TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL DEFAULT '',image TEXT,mime TEXT,sticker TEXT,feeling TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,archived INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created);
CREATE TABLE IF NOT EXISTS post_mentions(post TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,target TEXT NOT NULL,PRIMARY KEY(post,target));
CREATE TABLE IF NOT EXISTS character_views(character TEXT PRIMARY KEY,views INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS character_visits(character TEXT NOT NULL,visitor TEXT NOT NULL,day INTEGER NOT NULL,PRIMARY KEY(character,visitor,day));
CREATE TABLE IF NOT EXISTS profile_covers(user_id TEXT PRIMARY KEY REFERENCES users(id),file TEXT NOT NULL,position INTEGER NOT NULL DEFAULT 50,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS post_reactions(post TEXT NOT NULL REFERENCES posts(id),user_id TEXT NOT NULL REFERENCES users(id),emoji TEXT NOT NULL,PRIMARY KEY(post,user_id));
CREATE TABLE IF NOT EXISTS post_comments(id TEXT PRIMARY KEY,post TEXT NOT NULL REFERENCES posts(id),author TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL,created INTEGER NOT NULL,edited INTEGER);
CREATE INDEX IF NOT EXISTS post_comments_time ON post_comments(post,created);
CREATE TABLE IF NOT EXISTS comment_reactions(comment TEXT NOT NULL REFERENCES post_comments(id),user_id TEXT NOT NULL REFERENCES users(id),emoji TEXT NOT NULL,PRIMARY KEY(comment,user_id));
CREATE TABLE IF NOT EXISTS community_removals(kind TEXT NOT NULL,item_id TEXT NOT NULL,moderator TEXT NOT NULL REFERENCES users(id),created INTEGER NOT NULL,PRIMARY KEY(kind,item_id));
CREATE TABLE IF NOT EXISTS profile_verifications(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,verified INTEGER NOT NULL,moderator TEXT NOT NULL REFERENCES users(id),updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS moderation_actions(id TEXT PRIMARY KEY,moderator TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,subject TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS moderation_actions_created ON moderation_actions(created);
CREATE TABLE IF NOT EXISTS arcade_access(game_id TEXT PRIMARY KEY,public_enabled INTEGER NOT NULL DEFAULT 0 CHECK(public_enabled IN (0,1)),updated_by TEXT NOT NULL REFERENCES users(id),updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS arcade_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,game_id TEXT NOT NULL,level INTEGER NOT NULL,difficulty TEXT NOT NULL,status TEXT NOT NULL,snapshot TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,last_batch TEXT NOT NULL DEFAULT '',active_ticks INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS arcade_runs_user ON arcade_runs(user_id,game_id,status,level);
CREATE TABLE IF NOT EXISTS user_progression(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,tickets INTEGER NOT NULL DEFAULT 0,coins INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS economy_rewards(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event_key TEXT NOT NULL,tickets INTEGER NOT NULL DEFAULT 0,coins INTEGER NOT NULL DEFAULT 0,xp INTEGER NOT NULL DEFAULT 0,label TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,event_key));
CREATE TABLE IF NOT EXISTS economy_inventory(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item_id TEXT NOT NULL,acquired INTEGER NOT NULL,PRIMARY KEY(user_id,item_id));
CREATE TABLE IF NOT EXISTS simulator_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,autosave INTEGER NOT NULL DEFAULT 1,hidden TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS activity_days(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,day TEXT NOT NULL,surface TEXT NOT NULL,active_seconds INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL,PRIMARY KEY(user_id,day,surface));
CREATE TABLE IF NOT EXISTS game_runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,mode TEXT NOT NULL,status TEXT NOT NULL,snapshot TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,episode INTEGER NOT NULL DEFAULT 0,decisions INTEGER NOT NULL DEFAULT 0,active_seconds INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL,last_reward INTEGER NOT NULL,last_decision INTEGER NOT NULL DEFAULT 0,representatives TEXT NOT NULL DEFAULT '[]',winner TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS game_runs_user ON game_runs(user_id,status,updated);
CREATE TABLE IF NOT EXISTS casting_seasons(season TEXT PRIMARY KEY,sold INTEGER NOT NULL DEFAULT 0 CHECK(sold>=0 AND sold<=9));
CREATE TABLE IF NOT EXISTS casting_entries(season TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,audition_purchased INTEGER,direct_purchased INTEGER,direct_slot INTEGER,state TEXT NOT NULL DEFAULT 'ready',started INTEGER,finished INTEGER,step INTEGER NOT NULL DEFAULT 0,step_started INTEGER,deadline INTEGER,answers TEXT NOT NULL DEFAULT '{}',revision INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(season,user_id),UNIQUE(season,direct_slot));
CREATE INDEX IF NOT EXISTS casting_entries_state ON casting_entries(season,state,finished);
CREATE TABLE IF NOT EXISTS showdown_rooms(id TEXT PRIMARY KEY,host TEXT NOT NULL REFERENCES users(id),mode TEXT NOT NULL,status TEXT NOT NULL,snapshot TEXT NOT NULL,secret TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS showdown_members(room TEXT NOT NULL REFERENCES showdown_rooms(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,joined INTEGER NOT NULL,left_at INTEGER,PRIMARY KEY(room,user_id));
CREATE INDEX IF NOT EXISTS showdown_members_user ON showdown_members(user_id,joined);
CREATE TABLE IF NOT EXISTS showdown_chat(id TEXT PRIMARY KEY,room TEXT NOT NULL REFERENCES showdown_rooms(id) ON DELETE CASCADE,sender TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS showdown_chat_room ON showdown_chat(room,created);
CREATE TABLE IF NOT EXISTS showdown_invites(room TEXT NOT NULL REFERENCES showdown_rooms(id) ON DELETE CASCADE,target TEXT NOT NULL REFERENCES users(id),inviter TEXT NOT NULL REFERENCES users(id),message TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(room,target));
CREATE TABLE IF NOT EXISTS x_million_rooms(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL,host_id TEXT,state TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS x_million_rooms_updated ON x_million_rooms(updated);
CREATE TABLE IF NOT EXISTS x_million_questions(id TEXT PRIMARY KEY,created_by TEXT NOT NULL REFERENCES users(id),question TEXT NOT NULL,choices TEXT NOT NULL,correct_index INTEGER NOT NULL,category TEXT NOT NULL,difficulty TEXT NOT NULL,created INTEGER NOT NULL);`;

const profileColumns = [['gender_identity',"TEXT NOT NULL DEFAULT ''"],['pronouns',"TEXT NOT NULL DEFAULT ''"],['orientation',"TEXT NOT NULL DEFAULT ''"],['orientation_visible','INTEGER NOT NULL DEFAULT 0'],['sticker_favorites',"TEXT NOT NULL DEFAULT '[]'"]];
const tables = ['users','sessions','push_configuration','push_subscriptions','follows','conversations','members','messages','reactions','news_likes','posts','post_mentions','character_views','character_visits','profile_covers','post_reactions','post_comments','comment_reactions','community_removals','profile_verifications','moderation_actions','arcade_access','arcade_runs','user_progression','economy_rewards','economy_inventory','simulator_preferences','activity_days','game_runs','casting_seasons','casting_entries','showdown_rooms','showdown_members','showdown_chat','showdown_invites','x_million_rooms','x_million_questions'];
function postgresSQL(sql) {
  let n = 0;
  // SQL strings are fixed in the server. Values always travel separately as parameters.
  return sql.replace(/'(?:''|[^'])*'|\?|\browid\b|\b(?:users|sessions|push_configuration|push_subscriptions|follows|conversations|members|messages|reactions|news_likes|posts|post_mentions|character_views|character_visits|profile_covers|post_reactions|post_comments|comment_reactions|community_removals|profile_verifications|moderation_actions|arcade_access|arcade_runs|user_progression|economy_rewards|economy_inventory|simulator_preferences|activity_days|game_runs|casting_seasons|casting_entries|showdown_rooms|showdown_members|showdown_chat|showdown_invites|x_million_rooms|x_million_questions)\b/g, token => {
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
    if (!database.prepare('PRAGMA table_info(messages)').all().some(c=>c.name==='duration_ms')) database.exec('ALTER TABLE messages ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0');
    const userColumns=new Set(database.prepare('PRAGMA table_info(users)').all().map(c=>c.name));
    for(const [name,type] of profileColumns)if(!userColumns.has(name))database.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
    // Requests for live games may arrive while another asynchronous transaction is open.
    // Keep outside operations out of that transaction, so its rollback cannot undo them.
    const sqliteContext=new AsyncLocalStorage();let sqliteTail=Promise.resolve();
    const sqliteQuery=async(fn)=>{if(!sqliteContext.getStore())await sqliteTail;return fn();};
    return {
      kind:'sqlite',
      one: async (sql,...args)=>sqliteQuery(()=>database.prepare(sql).get(...args)),
      all: async (sql,...args)=>sqliteQuery(()=>database.prepare(sql).all(...args)),
      run: async (sql,...args)=>sqliteQuery(()=>database.prepare(sql).run(...args)),
      transaction: async fn=>{if(sqliteContext.getStore())throw new Error('No se permiten transacciones anidadas.');const previous=sqliteTail;let release;sqliteTail=new Promise(resolve=>release=resolve);await previous;database.exec('BEGIN');try{const value=await sqliteContext.run(true,fn);database.exec('COMMIT');return value;}catch(e){database.exec('ROLLBACK');throw e;}finally{release();}},
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
    await pool.query('ALTER TABLE xpedition.messages ADD COLUMN IF NOT EXISTS duration_ms BIGINT NOT NULL DEFAULT 0');
    for(const [name,type] of profileColumns)await pool.query(`ALTER TABLE xpedition.users ADD COLUMN IF NOT EXISTS ${name} ${type.replace('INTEGER','BIGINT')}`);
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
