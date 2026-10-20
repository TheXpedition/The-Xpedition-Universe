import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createECDH, randomBytes, createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { openDatabase } from '../database.mjs';
import { createPushNotifications, validatePushSubscription } from '../push-notifications.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
function subscription(suffix) {
  const key = createECDH('prime256v1'); key.generateKeys();
  return { endpoint: 'https://fcm.googleapis.com/fcm/send/' + suffix,
    keys: { p256dh: key.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}
async function backend(send = async () => {}) {
  assert(!process.env.DATABASE_URL, 'Push tests must use isolated SQLite, never a configured remote database.');
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'xp-push-test-')), db = await openDatabase(data);
  for (const id of ['alice', 'bob', 'outsider']) {
    await db.run('INSERT INTO users(id,name,name_key,email,avatar,created) VALUES(?,?,?,?,?,?)', id, id.toUpperCase(), id, id + '@example.invalid', 'Dua', Date.now());
    await db.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)', sha('token-' + id), id, Date.now() + 86400000);
    await db.run('INSERT INTO user_progression(user_id,tickets,coins,xp) VALUES(?,?,?,?)', id, 123, 456, 789);
  }
  await db.run('INSERT INTO conversations(id,type,title,created) VALUES(?,?,?,?)', 'room', 'group', 'Mi grupo', Date.now());
  for (const id of ['alice', 'bob']) await db.run('INSERT INTO members(conversation,user_id) VALUES(?,?)', 'room', id);
  await db.run('INSERT INTO messages(id,conversation,sender,text,created) VALUES(?,?,?,?,?)', 'message', 'room', 'alice', 'Hola, Bob', Date.now());
  const dependencies = { db, catalog: { characters: [{ name: 'Dua', image: 'personajes/dua.png' }] },
    body: async req => req.payload, checkRate() {}, send,
    fail(status, message) { throw Object.assign(new Error(message), { status }); },
    json(res, value) { res.value = value; } };
  const push = await createPushNotifications(dependencies);
  const call = async (id, route, method = 'GET', payload) => {
    const res = {};
    await push.handle({ method, headers: { cookie: 'xp_session=token-' + id }, payload }, res,
      new URL('https://example.invalid/api/push/' + route), id ? { id } : null);
    return res.value;
  };
  return { db, push, call, dependencies, close: () => db.close() };
}

test('la firma push persiste y el endpoint público jamás expone la clave privada ni altera saldos', async () => {
  const b = await backend();
  try {
    const first = await b.call(null, 'config');
    const second = await createPushNotifications(b.dependencies), response = {};
    await second.handle({ method: 'GET' }, response, new URL('https://example.invalid/api/push/config'), null);
    assert.deepEqual(first, response.value);
    assert.equal(Buffer.from(first.publicKey, 'base64url').length, 65);
    assert.deepEqual(Object.keys(first).sort(), ['enabled', 'publicKey']);
    assert.equal(Number((await b.db.one('SELECT COUNT(*) AS n FROM push_configuration')).n), 1);
    assert.deepEqual({ ...await b.db.one('SELECT tickets,coins,xp FROM user_progression WHERE user_id=?', 'bob') }, { tickets: 123, coins: 456, xp: 789 });
  } finally { await b.close(); }
});

test('solo los destinatarios actuales del chat reciben push; las vistas privadas exigen sesión y membresía', async () => {
  const sent = [], b = await backend(async (record, payload) => sent.push({ record, payload: JSON.parse(payload) }));
  try {
    for (const id of ['alice', 'bob', 'outsider']) await b.call(id, 'subscription', 'POST', { userId: id, subscription: subscription(id) });
    await b.push.notifyMessage({ id: 'message', conversation: 'room', sender: { id: 'alice' } });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].payload.recipient, 'bob');
    assert.equal(sent[0].payload.messageId, 'message');
    assert.equal(sent[0].payload.body, undefined);
    const notice = await b.call('bob', 'messages/message?recipient=bob');
    assert.equal(notice.title, 'ALICE');
    assert.equal(notice.body, 'Mi grupo · Hola, Bob');
    assert.equal(notice.icon, '/personajes/dua.png');
    assert.equal(notice.url, '/#mensajes/room');
    await assert.rejects(b.call('alice', 'messages/message?recipient=bob'), { status: 404 });
    await assert.rejects(b.call('outsider', 'messages/message?recipient=outsider'), { status: 404 });
    await assert.rejects(b.call(null, 'messages/message?recipient=bob'), { status: 401 });
    await b.db.run('UPDATE messages SET deleted=1 WHERE id=?', 'message');
    await assert.rejects(b.call('bob', 'messages/message?recipient=bob'), { status: 404 });
  } finally { await b.close(); }
});

test('cerrar la sesión elimina la vinculación push y desactivar un dispositivo no afecta a otro', async () => {
  const sent = [], b = await backend(async (record, payload) => sent.push(JSON.parse(payload)));
  try {
    const first = subscription('bob-first'), second = subscription('bob-second');
    await b.call('bob', 'subscription', 'POST', { userId: 'bob', subscription: first });
    await b.call('bob', 'subscription', 'POST', { userId: 'bob', subscription: second });
    await assert.rejects(b.call('alice', 'subscription', 'POST', { userId: 'bob', subscription: first }), { status: 409 });
    await b.call('alice', 'subscription', 'DELETE', { endpoint: first.endpoint });
    assert.equal(Number((await b.db.one('SELECT COUNT(*) AS n FROM push_subscriptions')).n), 2);
    await b.call('bob', 'subscription', 'DELETE', { endpoint: first.endpoint });
    assert.equal(Number((await b.db.one('SELECT COUNT(*) AS n FROM push_subscriptions')).n), 1);
    await b.db.run('DELETE FROM sessions WHERE user_id=?', 'bob');
    assert.equal(Number((await b.db.one('SELECT COUNT(*) AS n FROM push_subscriptions')).n), 0);
    await b.push.notifyMessage({ id: 'message', conversation: 'room', sender: { id: 'alice' } });
    assert.equal(sent.length, 0);
    assert.equal((await b.db.one('SELECT coins FROM user_progression WHERE user_id=?', 'bob')).coins, 456);
  } finally { await b.close(); }
});

test('el servicio solo borra suscripciones vencidas y rechaza destinos internos o claves falsas', async () => {
  const b = await backend(async record => { throw { statusCode: record.endpoint.endsWith('expired') ? 410 : 503 }; });
  try {
    for (const suffix of ['expired', 'temporary']) await b.call('bob', 'subscription', 'POST', { userId: 'bob', subscription: subscription(suffix) });
    await b.push.notifyMessage({ id: 'message', conversation: 'room', sender: { id: 'alice' } });
    const records = await b.db.all('SELECT subscription FROM push_subscriptions');
    assert.equal(records.length, 1); assert(records[0].subscription.includes('temporary'));
    const valid = subscription('validation');
    for (const endpoint of ['http://127.0.0.1/internal', 'https://localhost/private', 'https://fcm.googleapis.com.evil.invalid/x', 'https://fcm.googleapis.com:8443/x', 'https://user:pass@fcm.googleapis.com/x']) {
      assert.throws(() => validatePushSubscription({ ...valid, endpoint }), { status: 400 });
    }
    assert.throws(() => validatePushSubscription({ ...valid, keys: { ...valid.keys, auth: 'bad' } }), { status: 400 });
    await assert.rejects(b.call(null, 'subscription', 'POST', { userId: 'bob', subscription: valid }), { status: 401 });
  } finally { await b.close(); }
});

const workerSource = fs.readFileSync(new URL('../public/push-worker.js', import.meta.url), 'utf8');
function worker(response = { ok: true, json: async () => ({ title: 'Alice', body: 'Hola', icon: '/personajes/dua.png', url: '/#mensajes/room' }) }) {
  const handlers = {}, notices = [], opened = [];
  const context = { AbortController, setTimeout, clearTimeout, URL,
    fetch: async (url, options) => { assert.equal(options.credentials, 'include'); assert.equal(options.cache, 'no-store'); return response; },
    self: { addEventListener: (name, fn) => handlers[name] = fn, skipWaiting: async () => {}, location: { origin: 'https://example.invalid' },
      registration: { showNotification: async (title, options) => notices.push({ title, ...options }) },
      clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => opened.push(url) } } };
  vm.runInNewContext(workerSource, context);
  return { context, notices, opened, async event(name, input) { let done; handlers[name]({ ...input, waitUntil(value) { done = value; } }); await done; } };
}
test('el aviso del sistema incluye nombre y avatar y usa un aviso neutro si la sesión cambió', async () => {
  const w = worker();
  await w.event('push', { data: { json: () => ({ kind: 'message', messageId: 'message', recipient: 'bob' }) } });
  assert.equal(w.notices[0].title, 'Alice'); assert.equal(w.notices[0].icon, '/personajes/dua.png'); assert.equal(w.notices[0].silent, false);
  const revoked = worker({ ok: false });
  await revoked.event('push', { data: { json: () => ({ kind: 'message', messageId: 'message', recipient: 'bob', title: 'PRIVATE' }) } });
  assert.equal(revoked.notices[0].title, 'The Xpedition'); assert(!JSON.stringify(revoked.notices).includes('PRIVATE'));
});
test('tocar el aviso abre el chat sin aceptar URL externas ni sustituir un simulador abierto', async () => {
  const w = worker();
  w.context.self.clients.matchAll = async () => [{ url: 'https://example.invalid/simulator/', navigate() { throw new Error('Must not replace a game'); } }];
  await w.event('notificationclick', { notification: { close() {}, data: { url: '/#mensajes/room' } } });
  assert.equal(w.opened[0], 'https://example.invalid/#mensajes/room');
  await w.event('notificationclick', { notification: { close() {}, data: { url: 'https://evil.invalid/' } } });
  assert.equal(w.opened[1], 'https://example.invalid/#mensajes');
});

const clientSource = fs.readFileSync(new URL('../public/push-notifications.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setTimeout(resolve, 25));
function browser({ apple = false, standalone = false, permission = 'default' } = {}) {
  const dom = new JSDOM('<button data-push-settings>Notificaciones</button>', { url: 'https://example.invalid/', runScripts: 'outside-only' });
  const w = dom.window, calls = { permissions: 0, subscriptions: 0, unsubscribed: 0, saved: 0 };
  Object.defineProperty(w, 'isSecureContext', { value: true });
  Object.defineProperty(w.navigator, 'userAgent', { value: apple ? 'iPhone Safari' : 'Android Chrome' });
  Object.defineProperty(w.navigator, 'standalone', { value: standalone });
  w.matchMedia = () => ({ matches: false }); w.PushManager = class {};
  w.Notification = { permission, requestPermission() { calls.permissions++; this.permission = 'granted'; return Promise.resolve('granted'); } };
  let current = null;
  const registration = { pushManager: { async getSubscription() { return current; }, async subscribe() {
    calls.subscriptions++; current = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', toJSON() { return { endpoint: this.endpoint }; }, async unsubscribe() { calls.unsubscribed++; current = null; } }; return current;
  } } };
  Object.defineProperty(w.navigator, 'serviceWorker', { value: { async register() { return registration; }, ready: Promise.resolve(registration) } });
  w.fetch = async (url, options) => {
    if (options.method === 'POST' && url.endsWith('/subscription')) calls.saved++;
    return { ok: true, json: async () => ({ enabled: true, publicKey: 'B' + 'A'.repeat(86) }) };
  };
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.eval(clientSource);
  const session = id => w.dispatchEvent(new w.CustomEvent('xp:session', { detail: { id } }));
  return { w, calls, session, settings() { w.document.querySelector('[data-push-settings]').click(); } };
}
test('Android solicita permiso solo al tocar Activar y cerrar sesión desactiva la suscripción local', async () => {
  const b = browser();
  try {
    b.session('bob'); await settle();
    assert.equal(b.calls.permissions, 0); assert(b.w.document.querySelector('.xp-push-invite'));
    b.settings(); await settle();
    b.w.document.querySelector('[data-push-action="enable"]').click(); await settle();
    assert.equal(b.calls.permissions, 1); assert.equal(b.calls.saved, 1); assert(b.w.XpeditionPush.active);
    b.session(null); await settle();
    assert.equal(b.w.XpeditionPush.active, false); assert.equal(b.calls.unsubscribed, 1);
  } finally { b.w.close(); }
});
test('iPhone en una pestaña explica la instalación antes del permiso; la app instalada sí lo solicita al tocar', async () => {
  const tab = browser({ apple: true });
  try {
    tab.session('bob'); await settle(); tab.settings(); await settle();
    assert(tab.w.document.querySelector('.xp-push-detail').textContent.includes('instala The Xpedition'));
    assert.equal(tab.w.document.querySelector('[data-push-action="install"]').hidden, false);
    assert.equal(tab.calls.permissions, 0);
  } finally { tab.w.close(); }
  const app = browser({ apple: true, standalone: true });
  try {
    app.session('bob'); await settle(); app.settings(); await settle();
    app.w.document.querySelector('[data-push-action="enable"]').click(); await settle();
    assert.equal(app.calls.permissions, 1); assert.equal(app.calls.saved, 1);
  } finally { app.w.close(); }
});
