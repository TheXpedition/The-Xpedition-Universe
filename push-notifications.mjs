import webpush from 'web-push';
import { createHash, ECDH } from 'node:crypto';
import { publicContactEmail } from './monetization.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const failInput = message => { throw Object.assign(new Error(message), { status: 400 }); };
export function validatePushSubscription(value) {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) failInput('Suscripción inválida.');
  let endpoint;
  try { endpoint = new URL(value.endpoint); } catch { failInput('Suscripción inválida.'); }
  const host = endpoint.hostname;
  const provider = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
    host === 'web.push.apple.com' || host.endsWith('.push.apple.com') ||
    host.endsWith('.notify.windows.com') || host.endsWith('.notify.live.net');
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port || endpoint.hash || !provider) {
    failInput('El navegador no proporcionó un servicio de notificaciones admitido.');
  }
  const keys = value.keys;
  if (!keys || ![keys.p256dh, keys.auth].every(key => typeof key === 'string' && /^[A-Za-z0-9_-]+$/.test(key))) failInput('Claves de notificación inválidas.');
  const publicKey = Buffer.from(keys.p256dh, 'base64url'), auth = Buffer.from(keys.auth, 'base64url');
  if (publicKey.length !== 65 || publicKey[0] !== 4 || auth.length !== 16) failInput('Claves de notificación inválidas.');
  try { ECDH.convertKey(publicKey, 'prime256v1'); } catch { failInput('Claves de notificación inválidas.'); }
  return { endpoint: endpoint.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export async function createPushNotifications({ db, body, json, fail, checkRate, catalog,
  serialize = fn => fn(), send = (...args) => webpush.sendNotification(...args) }) {
  // Keep the same signing key across deployments; this table is server-only.
  let keys = await db.one('SELECT * FROM push_configuration WHERE name=?', 'primary');
  if (!keys) {
    const generated = webpush.generateVAPIDKeys();
    await db.run('INSERT INTO push_configuration(name,public_key,private_key,created) VALUES(?,?,?,?) ON CONFLICT(name) DO NOTHING',
      'primary', generated.publicKey, generated.privateKey, Date.now());
    keys = await db.one('SELECT * FROM push_configuration WHERE name=?', 'primary');
  }
  const options = { vapidDetails: { subject: 'mailto:' + publicContactEmail, publicKey: keys.public_key, privateKey: keys.private_key },
    TTL: 3600, urgency: 'high', timeout: 8000 };
  const sessionHash = req => hash((req.headers.cookie || '').match(/(?:^|;\s*)xp_session=([^;]+)/)?.[1] || '');
  async function deliver(record, payload, queued = false) {
    try { await send(JSON.parse(record.subscription), JSON.stringify(payload), options); return true; }
    catch (error) {
      if ([404, 410].includes(error.statusCode)) {
        const remove = () => db.run('DELETE FROM push_subscriptions WHERE endpoint_hash=? AND updated=?', record.endpoint_hash, record.updated);
        await (queued ? serialize(remove) : remove());
      } else console.warn('Entrega push pendiente o rechazada:', error.statusCode || error.code || 'PUSH_ERROR');
      return false;
    }
  }
  async function notifyMessage(message) {
    if (!message?.id || !message.sender?.id || message.deleted || message.type === 'deleted') return;
    const records = await db.all('SELECT ps.* FROM push_subscriptions ps JOIN sessions s ON s.token=ps.session_token JOIN members m ON m.user_id=ps.user_id WHERE m.conversation=? AND ps.user_id<>? AND s.expires>?',
      message.conversation, message.sender.id, Date.now());
    await Promise.allSettled(records.map(record => deliver(record, {
      kind: 'message', messageId: message.id, recipient: record.user_id
    }, true)));
  }
  async function handle(req, res, url, user) {
    const route = url.pathname, method = req.method;
    if (!route.startsWith('/api/push/')) return false;
    if (route === '/api/push/config' && method === 'GET') {
      json(res, { enabled: true, publicKey: keys.public_key }); return true;
    }
    if (!user) fail(401, 'Inicia sesión para activar tus notificaciones.');
    const messageMatch = route.match(/^\/api\/push\/messages\/([^/]+)$/);
    if (messageMatch && method === 'GET') {
      if (url.searchParams.get('recipient') !== user.id) fail(404, 'Este aviso pertenece a otra sesión.');
      const message = await db.one('SELECT m.*,u.name AS sender_name,u.avatar AS sender_avatar,c.title AS chat_title,c.type AS chat_type FROM messages m JOIN users u ON u.id=m.sender JOIN conversations c ON c.id=m.conversation JOIN members member ON member.conversation=m.conversation AND member.user_id=? WHERE m.id=? AND m.deleted=0 AND m.sender<>?',
        user.id, decodeURIComponent(messageMatch[1]), user.id);
      if (!message) fail(404, 'Este mensaje ya no está disponible.');
      const image = catalog.characters.find(character => character.name === message.sender_avatar)?.image;
      const preview = message.text || ({ image: 'Te envió una imagen', video: 'Te envió un video', audio: 'Te envió un mensaje de voz', sticker: 'Te envió un sticker' }[message.type] || 'Nuevo mensaje');
      const unread = await db.one('SELECT COUNT(*) AS count FROM messages m JOIN members member ON member.conversation=m.conversation WHERE member.user_id=? AND m.sender<>? AND m.deleted=0 AND m.created>member.read_at', user.id, user.id);
      json(res, { title: message.sender_name, body: ((message.chat_type === 'group' ? message.chat_title + ' · ' : '') + preview).slice(0, 200),
        icon: image ? '/' + image : '/brand/xpedition-transparent-v2-192.png', tag: 'xp-message:' + message.id,
        url: '/#mensajes/' + encodeURIComponent(message.conversation), unread: Number(unread.count) });
      return true;
    }
    if (route === '/api/push/subscription' && method === 'POST') {
      checkRate(req, 'push-subscribe', 30, 60000);
      const input = await body(req);
      if (input.userId !== user.id) fail(409, 'Tu sesión cambió. Actualiza la página antes de activar los avisos.');
      const subscription = validatePushSubscription(input.subscription);
      const id = hash(subscription.endpoint), old = await db.one('SELECT * FROM push_subscriptions WHERE endpoint_hash=?', id);
      if (old && old.user_id !== user.id) {
        const prior = JSON.parse(old.subscription);
        if (prior.keys.p256dh !== subscription.keys.p256dh || prior.keys.auth !== subscription.keys.auth) fail(409, 'La suscripción de este navegador debe renovarse.');
      }
      if (!old && Number((await db.one('SELECT COUNT(*) AS count FROM push_subscriptions WHERE user_id=?', user.id)).count) >= 10) fail(409, 'Ya tienes diez dispositivos con avisos activos.');
      const now = Date.now();
      await db.run('INSERT INTO push_subscriptions(endpoint_hash,user_id,session_token,subscription,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint_hash) DO UPDATE SET user_id=excluded.user_id,session_token=excluded.session_token,subscription=excluded.subscription,updated=excluded.updated',
        id, user.id, sessionHash(req), JSON.stringify(subscription), now, now);
      json(res, { enabled: true }); return true;
    }
    if (route === '/api/push/subscription' && method === 'DELETE') {
      const input = await body(req);
      if (typeof input.endpoint !== 'string' || input.endpoint.length > 2048) fail(400, 'Suscripción inválida.');
      await db.run('DELETE FROM push_subscriptions WHERE endpoint_hash=? AND user_id=?', hash(input.endpoint), user.id);
      json(res, { enabled: false }); return true;
    }
    if (route === '/api/push/test' && method === 'POST') {
      checkRate(req, 'push-test', 4, 60000);
      const input = await body(req);
      if (typeof input.endpoint !== 'string' || input.endpoint.length > 2048) fail(400, 'Suscripción inválida.');
      const record = await db.one('SELECT * FROM push_subscriptions WHERE endpoint_hash=? AND user_id=? AND session_token=?', hash(input.endpoint), user.id, sessionHash(req));
      if (!record) fail(404, 'Activa los avisos en este dispositivo primero.');
      const sent = await deliver(record, { kind: 'test' });
      if (!sent) fail(503, 'El servicio no confirmó la entrega. Vuelve a activar los avisos e inténtalo otra vez.');
      json(res, { sent: true }); return true;
    }
    fail(404, 'Opción de notificaciones no encontrada.');
  }
  return { handle, notifyMessage };
}
