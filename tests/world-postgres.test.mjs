import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { schema, postgresSQL } from '../database.mjs';
import { serverDatabase } from '../world-server-store.mjs';
import { createWorld } from '../world.mjs';
import { createProgression } from '../progression.mjs';
import { createArcade } from '../arcade.mjs';
import { WORLD_MAPS } from '../public/juegos/world-maps.mjs';

test('a fresh independent World bootstraps with PostgreSQL BIGINT coordinates', { timeout: 60000 }, async () => {
 const pg = new PGlite(), ctx = new AsyncLocalStorage();
 let tail = Promise.resolve(), world;
 const query = async (sql, args = []) => {
  if (!ctx.getStore()) await tail;
  return (ctx.getStore() || pg).query(postgresSQL(sql), args, { parsers: { 20: Number } });
 };
 const db = {
  kind: 'postgres',
  one: async (sql, ...args) => (await query(sql, args)).rows[0],
  all: async (sql, ...args) => (await query(sql, args)).rows,
  run: async (sql, ...args) => ({ changes: (await query(sql, args)).affectedRows }),
  transaction: async fn => {
   const previous = tail; let release;
   tail = new Promise(resolve => { release = resolve; });
   await previous;
   try { return await pg.transaction(tx => ctx.run(tx, fn)); }
   finally { release(); }
  },
  close: () => pg.close(),
 };
 try {
  await pg.exec('CREATE SCHEMA xpedition;' + postgresSQL(schema.replace(/\bINTEGER\b/g, 'BIGINT').replace('CREATE TABLE IF NOT EXISTS messages(', 'CREATE TABLE IF NOT EXISTS messages(xp_sequence BIGSERIAL UNIQUE,')));
  const staff = '92354719-8816-4e25-9199-0dc9a99f7da1', id = randomUUID(), lease = randomUUID();
  await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)', staff, 'SQL test', 'sqltest', 'sql@example.invalid', 'Dani', Date.now());
  await db.run('INSERT INTO world_servers(id,name,creator,enabled,settings,created,updated) VALUES(?,?,?,1,?,?,?)', id, 'Postgres test', staff, '{}', Date.now(), Date.now());
  await db.run('INSERT INTO world_server_leases(server_id,owner,expires) VALUES(?,?,?)', id, lease, Date.now() + 3600000);
  const scoped = await serverDatabase(db, id, { leaseOwner: lease });
  await scoped.run('INSERT INTO world_access(resource,enabled,updated_by,updated) VALUES(?,1,?,?)', 'world', staff, Date.now());
  const fail = (status, message) => { throw Object.assign(Error(message), { status }); };
  let output;
  const json = (_res, value) => { output = value; }, body = async () => ({}), serialize = async fn => fn();
  const progression = createProgression({ db: scoped, shop: JSON.parse(fs.readFileSync(new URL('../public/simulator/catalog.json', import.meta.url))), catalog: JSON.parse(fs.readFileSync(new URL('../public/catalog.json', import.meta.url))), body, json, fail, checkRate() {}, serialize, notify: async () => {} });
  const arcade = createArcade({ db: scoped, json, fail, body, checkRate() {}, progression, worldOnly: true });
  world = createWorld({ db: scoped, json, fail, body, getSession: async () => null, progression, arcade, serverConfig: { id, name: 'Postgres test', autoBots: true } });
  const user = { id: staff, name: 'SQL test' };
  const bootstrap = () => world.handle({ method: 'GET' }, { setHeader() {}, getHeader() {} }, new URL('http://localhost/api/world/bootstrap'), user);
  await bootstrap();
  assert.equal(output.intro.seen, false);
  assert.equal(output.user.wallet.coins, 0);
  assert.equal(output.profile.x, Math.round(WORLD_MAPS['tren-pasajeros'].spawn[0]));
  assert.equal(output.profile.y, Math.round(WORLD_MAPS['tren-pasajeros'].spawn[1]));
  // Returning accounts keep their saved position instead of being reinitialized.
  await scoped.run('UPDATE world_preferences SET x=?,y=? WHERE user_id=?', 891, 1198, staff);
  await bootstrap();
  assert.equal(output.profile.x, 891);
  assert.equal(output.profile.y, 1198);
 } finally {
  if (world) await world.close();
  await pg.close();
 }
});
