import http from 'node:http';
import {openDatabase} from './database.mjs';
import {openStorage} from './storage.mjs';
import {randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const db = await openDatabase(dataDir);
const storage = await openStorage(dataDir, db.kind === 'postgres');
const publicUrl = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const catalog = JSON.parse(fs.readFileSync(path.join(publicDir, 'catalog.json'), 'utf8'));
const canonical = v => String(v || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
const characterId = name => 'char:' + name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const characters = catalog.characters.map(c => ({
  id: characterId(c.name),
  name: c.name,
  avatar: c.name,
  bio: `Personaje del universo The Xpedition.`,
  stats: catalog.stats[c.name] || ({}),
  character: true
}));
const characterIds = new Set(characters.map(c => c.id));
const scrypt = promisify(scryptCb);
const hashToken = v => createHash('sha256').update(v).digest('hex');
const one = (sql, ...args) => db.one(sql, ...args);
const all = (sql, ...args) => db.all(sql, ...args);
const run = (sql, ...args) => db.run(sql, ...args);
const fail = (status, message) => {
  throw Object.assign(new Error(message), {
    status
  });
};
const stamp = () => Date.now();
const events = new Map();
const limits = new Map();
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDzr1AlXYOqw1IVWpJvQ-7aeHJS0p9KaEQ',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'the-xpedition.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'the-xpedition',
  appId: '1:163499451928:web:abca7f7d61cb2c616f856d'
};
let googleInfo = {
  available: null,
  authorizedDomains: []
};
fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${firebaseConfig.apiKey}`, {
  signal: AbortSignal.timeout(12000)
}).then(r => r.json()).then(v => {
  googleInfo = {
    available: !v.error,
    authorizedDomains: v.authorizedDomains || []
  };
}).catch(() => {});
async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + Buffer.from(await scrypt(password, salt, 64)).toString('hex');
}
async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const candidate = Buffer.from(await scrypt(password, salt, 64));
  const actual = Buffer.from(hash, 'hex');
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}
function userFields(u) {
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    bio: u.bio,
    created: u.created,
    character: false,
    online: events.has(u.id),
    followers: Number(u.followers || 0),
    following: Number(u.following || 0)
  };
}
const countedUsers = 'SELECT u.*, (SELECT COUNT(*) FROM follows WHERE target=u.id) AS followers, (SELECT COUNT(*) FROM follows WHERE actor=u.id) AS following FROM users u';
async function safeUser(u, own = false) {
  if (!u) return null;
  const counted = u.followers === undefined ? await one(countedUsers + ' WHERE u.id=?', u.id) : u;
  const result = userFields(counted);
  if (own) Object.assign(result, {
    email: u.email,
    saved: JSON.parse(u.saved),
    follows: (await all('SELECT target FROM follows WHERE actor=?', u.id)).map(x => x.target),
    hasPassword: !!u.password
  });
  return result;
}
async function profiles() {
  const counts = new Map((await all('SELECT target,COUNT(*) AS n FROM follows GROUP BY target')).map(x => [x.target, Number(x.n)]));
  const users = await all(countedUsers + ' ORDER BY u.created');
  return [...characters.map(c => ({
    ...c,
    followers: counts.get(c.id) || 0,
    following: 0,
    online: false
  })), ...users.map(userFields)];
}
function notify(userIds, type, payload = {}) {
  const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const id of new Set(userIds)) for (const stream of events.get(id) || []) stream.res.write(data);
}
function everyone(type, payload) {
  notify([...events.keys()], type, payload);
}
async function memberIds(id) {
  return (await all('SELECT user_id FROM members WHERE conversation=?', id)).map(x => x.user_id);
}
async function requireMember(id, uid) {
  const conv = await one('SELECT * FROM conversations WHERE id=?', id);
  if (!conv || !await one('SELECT 1 FROM members WHERE conversation=? AND user_id=?', id, uid)) fail(404, 'Conversación no encontrada.');
  return conv;
}
async function messageViews(rows) {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map(m => m.sender))], mids = rows.map(m => m.id), replyIds = [...new Set(rows.map(m => m.reply_to).filter(Boolean))];
  const marks = values => values.map(() => '?').join(',');
  const users = new Map((await all(countedUsers + ' WHERE u.id IN (' + marks(ids) + ')', ...ids)).map(u => [u.id, userFields(u)]));
  const reactions = await all('SELECT message,emoji,user_id FROM reactions WHERE message IN (' + marks(mids) + ')', ...mids);
  const replies = replyIds.length ? new Map((await all('SELECT m.id,m.text,m.deleted,u.name FROM messages m JOIN users u ON u.id=m.sender WHERE m.id IN (' + marks(replyIds) + ')', ...replyIds)).map(r => [r.id, r])) : new Map();
  return rows.map(m => {
    const reply = replies.get(m.reply_to);
    return {
      id: m.id,
      conversation: m.conversation,
      sender: users.get(m.sender),
      text: m.deleted ? '' : m.text,
      type: m.deleted ? 'deleted' : m.type,
      url: !m.deleted && m.file ? '/api/files/' + m.id : null,
      filename: m.deleted ? null : m.filename,
      reply: reply ? {
        id: reply.id,
        text: reply.deleted ? 'Mensaje eliminado' : reply.text || 'Archivo adjunto',
        name: reply.name
      } : null,
      created: m.created,
      edited: m.edited,
      reactions: reactions.filter(r => r.message === m.id).map(({emoji, user_id}) => ({
        emoji,
        user_id
      }))
    };
  });
}
async function messageView(m) {
  return (await messageViews([m]))[0];
}
async function conversationList(rows, uid) {
  if (!rows.length) return [];
  const ids = rows.map(c => c.id), marks = ids.map(() => '?').join(',');
  const members = await all(countedUsers.replace('FROM users u', 'FROM users u JOIN members m ON m.user_id=u.id').replace('SELECT u.*,', 'SELECT u.*,m.conversation,m.role,m.read_at,') + ' WHERE m.conversation IN (' + marks + ')', ...ids);
  const lastRows = await all('SELECT m.* FROM messages m JOIN (SELECT conversation,MAX(created) AS latest FROM messages WHERE conversation IN (' + marks + ') GROUP BY conversation) latest ON latest.conversation=m.conversation AND latest.latest=m.created', ...ids);
  const last = new Map((await messageViews(lastRows)).map(m => [m.conversation, m]));
  const unread = new Map((await all('SELECT m.conversation,COUNT(*) AS n FROM messages m JOIN members r ON r.conversation=m.conversation AND r.user_id=? WHERE m.sender!=? AND m.created>r.read_at GROUP BY m.conversation', uid, uid)).map(m => [m.conversation, Number(m.n)]));
  return rows.map(c => ({
    id: c.id,
    type: c.type,
    title: c.title,
    created: c.created,
    onlyAdminWrite: !!c.only_admin,
    icon: c.icon ? '/api/group-icons/' + encodeURIComponent(c.id) : null,
    members: members.filter(m => m.conversation === c.id).map(m => ({
      ...userFields(m),
      role: m.role,
      readAt: m.read_at
    })),
    last: last.get(c.id) || null,
    unread: unread.get(c.id) || 0
  }));
}
async function conversationView(c, uid) {
  return (await conversationList([c], uid))[0];
}
async function conversations(uid) {
  return (await conversationList(await all('SELECT c.* FROM conversations c JOIN members m ON m.conversation=c.id WHERE m.user_id=?', uid), uid)).sort((a, b) => (b.last?.created || b.created) - (a.last?.created || a.created));
}
async function makeSession(req, res, uid) {
  const token = randomBytes(32).toString('hex');
  await run('INSERT INTO sessions VALUES (?,?,?)', hashToken(token), uid, stamp() + 30 * 86400000);
  const secure = process.env.SECURE_COOKIES === 'true' || publicUrl.startsWith('https://');
  res.setHeader('Set-Cookie', `xp_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure ? '; Secure' : ''}`);
}
async function getSession(req) {
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('xp_session='))?.slice(11);
  if (!cookie) return null;
  return await one('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?', hashToken(cookie), stamp()) || null;
}
function checkRate(req, group, max, windowMs) {
  const ip = process.env.TRUST_PROXY === 'true' ? String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim() || req.socket.remoteAddress : req.socket.remoteAddress;
  const key = `${ip}:${group}`;
  const old = limits.get(key);
  const entry = old && old.until > stamp() ? old : {
    count: 0,
    until: stamp() + windowMs
  };
  entry.count++;
  limits.set(key, entry);
  if (entry.count > max) fail(429, 'Demasiados intentos. Espera unos minutos y vuelve a intentar.');
}
async function body(req) {
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 9 * 1024 * 1024) fail(413, 'El archivo es demasiado grande.');
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString() || '{}');
  } catch {
    fail(400, 'Solicitud inválida.');
  }
}
function json(res, value, code = 200) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(value));
}
function checkName(name) {
  const clean = String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (clean.length < 3 || clean.length > 40 || !(/^[\p{L}\p{N} ._'’-]+$/u).test(clean)) fail(400, 'Usa un nombre de 3 a 40 caracteres, con letras o números.');
  if (catalog.roster.some(n => canonical(n) === canonical(clean))) fail(409, 'Ese nombre pertenece a un personaje. Elige tu nombre de usuario y luego su ícono.');
  return clean;
}
function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) fail(400, 'La contraseña debe tener entre 8 y 128 caracteres.');
}
async function firebaseRequest(action, values) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(values),
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok) fail(401, 'No se pudo validar la cuenta. Revisa tus datos o vuelve a entrar con Google.');
  return result;
}
async function firebaseAccount(idToken) {
  if (typeof idToken !== 'string' || idToken.length > 20000) fail(400, 'Credencial inválida.');
  const result = await firebaseRequest('lookup', {
    idToken
  });
  const remote = result.users?.[0];
  if (!remote?.localId || !remote.email) fail(401, 'La cuenta de Google no tiene correo disponible.');
  let u = await one('SELECT * FROM users WHERE firebase_id=?', remote.localId);
  if (!u && await one('SELECT 1 FROM users WHERE email=?', remote.email.toLowerCase())) fail(409, 'Este correo ya tiene una cuenta. Entra con su contraseña.');
  if (!u) {
    let name = String(remote.displayName || remote.email.split('@')[0]).replace(/[^\p{L}\p{N} ._'’-]/gu, '').trim().slice(0, 30) || 'Explorador';
    if (name.length < 3) name += ' XP';
    while (catalog.roster.some(n => canonical(n) === canonical(name)) || await one('SELECT 1 FROM users WHERE name_key=?', canonical(name))) name = name.slice(0, 30) + ' ' + randomBytes(2).toString('hex');
    const id = randomUUID();
    await run('INSERT INTO users(id,name,name_key,email,firebase_id,avatar,bio,created) VALUES (?,?,?,?,?,?,?,?)', id, name, canonical(name), remote.email.toLowerCase(), remote.localId, 'Dani', 'Mi próxima aventura empieza aquí.', stamp());
    u = await one('SELECT * FROM users WHERE id=?', id);
    everyone('profiles', {});
  }
  return u;
}
async function api(req, res, url) {
  const p = url.pathname;
  const method = req.method;
  if (!['GET', 'HEAD'].includes(method)) {
    const origin = req.headers.origin;
    const expected = publicUrl || `http://${req.headers.host}`;
    if (origin && origin !== expected) fail(403, 'Origen no autorizado.');
    if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Usa contenido JSON.');
  }
  const u = await getSession(req);
  if (p === '/api/config' && method === 'GET') return json(res, {
    firebase: firebaseConfig,
    google: googleInfo
  });
  if (p === '/api/health' && method === 'GET') {
    await one('SELECT 1 AS n');
    return json(res, {
      ok: true,
      database: db.kind,
      storage: storage.kind,
      version: '2.0.0'
    });
  }
  if (p === '/api/me' && method === 'GET') return json(res, {
    user: await safeUser(u, true)
  });
  if (p === '/api/profiles' && method === 'GET') return json(res, {
    profiles: await profiles()
  });
  if (p === '/api/news' && method === 'GET') {
    const counts = new Map((await all('SELECT news,COUNT(*) AS n FROM news_likes GROUP BY news')).map(x => [x.news, Number(x.n)]));
    const liked = new Set(u ? (await all('SELECT news FROM news_likes WHERE user_id=?', u.id)).map(x => x.news) : []);
    return json(res, {
      likes: catalog.news.map(n => ({
        id: n.id,
        count: counts.get(n.id) || 0,
        liked: liked.has(n.id)
      }))
    });
  }
  if (p.startsWith('/api/auth/') && method === 'POST') checkRate(req, 'auth', 30, 15 * 60000);
  if (p === '/api/auth/register' && method === 'POST') {
    const b = await body(req);
    const name = checkName(b.name);
    const email = String(b.email || '').trim().toLowerCase();
    checkPassword(b.password);
    if (email.length > 254 || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)) fail(400, 'Escribe un correo válido.');
    if (await one('SELECT 1 FROM users WHERE name_key=? OR email=?', canonical(name), email)) fail(409, 'Ese usuario o correo ya está registrado.');
    const password = await passwordHash(b.password);
    const id = randomUUID();
    try {
      await run('INSERT INTO users(id,name,name_key,email,password,avatar,bio,created) VALUES(?,?,?,?,?,?,?,?)', id, name, canonical(name), email, password, 'Dani', 'Mi próxima aventura empieza aquí.', stamp());
    } catch {
      fail(409, 'Ese usuario o correo ya está registrado.');
    }
    await makeSession(req, res, id);
    everyone('profiles', {});
    return json(res, {
      user: await safeUser(await one('SELECT * FROM users WHERE id=?', id), true)
    }, 201);
  }
  if (p === '/api/auth/login' && method === 'POST') {
    const b = await body(req);
    if (typeof b.password !== 'string' || b.password.length > 128) fail(400, 'Revisa tu usuario y contraseña.');
    let account = await one('SELECT * FROM users WHERE email=? OR name_key=?', canonical(b.login), canonical(b.login));
    if (account) {
      if (!await verifyPassword(b.password, account.password)) fail(401, 'Usuario o contraseña incorrectos.');
    } else if (String(b.login).includes('@')) {
      const remote = await firebaseRequest('signInWithPassword', {
        email: b.login,
        password: b.password,
        returnSecureToken: true
      });
      account = await firebaseAccount(remote.idToken);
    } else {
      await passwordHash(b.password);
      fail(401, 'Usuario o contraseña incorrectos.');
    }
    await makeSession(req, res, account.id);
    return json(res, {
      user: await safeUser(account, true)
    });
  }
  if (p === '/api/auth/google' && method === 'POST') {
    const b = await body(req);
    const account = await firebaseAccount(b.idToken);
    await makeSession(req, res, account.id);
    return json(res, {
      user: await safeUser(account, true)
    });
  }
  if (p === '/api/auth/logout' && method === 'POST') {
    const token = (req.headers.cookie || '').match(/(?:^|;\s*)xp_session=([^;]+)/)?.[1];
    if (token) await run('DELETE FROM sessions WHERE token=?', hashToken(token));
    res.setHeader('Set-Cookie', 'xp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    if (u) for (const stream of events.get(u.id) || []) if (stream.token === hashToken(token || '')) stream.res.end();
    return json(res, {
      ok: true
    });
  }
  if (!u) fail(401, 'Inicia sesión para continuar.');
  const connections = p.match(/^\/api\/profiles\/([^/]+)\/(followers|following)$/);
  if (connections && method === 'GET') {
    const id = decodeURIComponent(connections[1]);
    if (!characterIds.has(id) && !await one('SELECT 1 FROM users WHERE id=?', id)) fail(404, 'Perfil no encontrado.');
    const ids = connections[2] === 'followers' ? await all('SELECT actor AS id FROM follows WHERE target=?', id) : await all('SELECT target AS id FROM follows WHERE actor=?', id);
    const wanted = new Set(ids.map(x => x.id));
    return json(res, {
      profiles: (await profiles()).filter(p => wanted.has(p.id))
    });
  }
  if (p === '/api/events' && method === 'GET') {
    const set = events.get(u.id) || new Set();
    if (set.size >= 8) fail(429, 'Hay demasiadas ventanas abiertas.');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    const token = hashToken((req.headers.cookie || '').match(/(?:^|;\s*)xp_session=([^;]+)/)?.[1] || '');
    const stream = {
      res,
      token
    };
    set.add(stream);
    events.set(u.id, set);
    res.write('event: ready\ndata: {}\n\n');
    everyone('presence', {
      id: u.id,
      online: true
    });
    const timer = setInterval(async () => {
      try {
        if (!await one('SELECT 1 FROM sessions WHERE token=? AND expires>?', token, stamp())) return res.end();
        res.write(': heartbeat\n\n');
      } catch {
        res.end();
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(timer);
      set.delete(stream);
      if (!set.size) {
        events.delete(u.id);
        everyone('presence', {
          id: u.id,
          online: false
        });
      }
    });
    return;
  }
  if (p === '/api/me' && method === 'PATCH') {
    const b = await body(req);
    const name = b.name === undefined ? u.name : checkName(b.name);
    const avatar = b.avatar === undefined ? u.avatar : b.avatar;
    if (!catalog.characters.some(c => c.name === avatar)) fail(400, 'Elige un personaje del catálogo.');
    const bio = b.bio === undefined ? u.bio : String(b.bio).trim();
    if (bio.length > 600) fail(400, 'La biografía admite hasta 600 caracteres.');
    const saved = b.saved === undefined ? JSON.parse(u.saved) : b.saved;
    if (!Array.isArray(saved) || saved.length > 200 || saved.some(id => !Object.values(catalog.content).flat().some(c => c.id === id))) fail(400, 'Lista inválida.');
    try {
      await run('UPDATE users SET name=?,name_key=?,avatar=?,bio=?,saved=? WHERE id=?', name, canonical(name), avatar, bio, JSON.stringify([...new Set(saved)]), u.id);
    } catch {
      fail(409, 'Ese nombre ya está en uso.');
    }
    everyone('profiles', {});
    return json(res, {
      user: await safeUser(await one('SELECT * FROM users WHERE id=?', u.id), true)
    });
  }
  if (p === '/api/me/password' && method === 'POST') {
    const b = await body(req);
    checkPassword(b.password);
    if (!u.password) fail(400, 'Tu cuenta usa Google o Firebase. Gestiona su contraseña con ese proveedor.');
    if (typeof b.current !== 'string' || !await verifyPassword(b.current, u.password)) fail(400, 'La contraseña actual no coincide.');
    const password = await passwordHash(b.password);
    await db.transaction(async () => {
      await run('UPDATE users SET password=? WHERE id=?', password, u.id);
      await run('DELETE FROM sessions WHERE user_id=?', u.id);
      await makeSession(req, res, u.id);
    });
    return json(res, {
      ok: true
    });
  }
  const follow = p.match(/^\/api\/follow\/([^/]+)$/);
  if (follow && method === 'POST') {
    const id = decodeURIComponent(follow[1]);
    if (id === u.id) fail(400, 'Este es tu propio perfil.');
    if (!characterIds.has(id) && !await one('SELECT 1 FROM users WHERE id=?', id)) fail(404, 'Perfil no encontrado.');
    const b = await body(req);
    if (typeof b.follow !== 'boolean') fail(400, 'Seguimiento inválido.');
    if (b.follow) await run('INSERT INTO follows VALUES (?,?) ON CONFLICT DO NOTHING', u.id, id); else await run('DELETE FROM follows WHERE actor=? AND target=?', u.id, id);
    everyone('profiles', {});
    return json(res, {
      user: await safeUser(await one('SELECT * FROM users WHERE id=?', u.id), true)
    });
  }
  const news = p.match(/^\/api\/news\/([^/]+)\/like$/);
  if (news && method === 'POST') {
    const id = news[1];
    if (!catalog.news.some(n => n.id === id)) fail(404, 'Noticia no encontrada.');
    const b = await body(req);
    if (b.liked) await run('INSERT INTO news_likes VALUES(?,?) ON CONFLICT DO NOTHING', id, u.id); else await run('DELETE FROM news_likes WHERE news=? AND user_id=?', id, u.id);
    everyone('news', {});
    return json(res, {
      ok: true
    });
  }
  if (p === '/api/conversations' && method === 'GET') return json(res, {
    conversations: await conversations(u.id)
  });
  if (p === '/api/conversations' && method === 'POST') {
    const b = await body(req);
    const type = b.type === 'group' ? 'group' : 'dm';
    const ids = [...new Set([u.id, ...Array.isArray(b.members) ? b.members : []])];
    if (ids.length < 2 || ids.length > 30 || ids.some(id => typeof id !== 'string')) fail(400, 'Elige entre 1 y 29 cuentas registradas.');
    for (const uid of ids) if (!await one('SELECT 1 FROM users WHERE id=?', uid)) fail(400, 'Cuenta no encontrada.');
    if (type === 'dm' && ids.length !== 2) fail(400, 'Un chat directo tiene dos participantes.');
    const id = type === 'dm' ? 'dm:' + ids.sort().join(':') : randomUUID();
    const title = type === 'group' ? String(b.title || '').trim() : '';
    if (type === 'group' && (title.length < 2 || title.length > 70)) fail(400, 'Ponle un nombre al grupo de 2 a 70 caracteres.');
    if (!await one('SELECT 1 FROM conversations WHERE id=?', id)) await db.transaction(async () => {
      await run('INSERT INTO conversations(id,type,title,created) VALUES(?,?,?,?)', id, type, title, stamp());
      for (const uid of ids) await run('INSERT INTO members(conversation,user_id,role) VALUES(?,?,?)', id, uid, uid === u.id ? 'admin' : 'member');
    });
    notify(ids, 'conversations', {});
    return json(res, {
      conversation: await conversationView(await one('SELECT * FROM conversations WHERE id=?', id), u.id)
    }, 201);
  }
  const convMatch = p.match(/^\/api\/conversations\/([^/]+)(?:\/(messages|read|typing|members))?$/);
  if (convMatch) {
    const id = decodeURIComponent(convMatch[1]);
    const conv = await requireMember(id, u.id);
    const action = convMatch[2];
    if (action === 'messages' && method === 'GET') {
      const before = Math.min(Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      const rows = await all('SELECT * FROM messages WHERE conversation=? AND created<? ORDER BY created DESC,rowid DESC LIMIT 61', id, before);
      return json(res, {
        messages: await messageViews(rows.slice(0, 60).reverse()),
        hasMore: rows.length > 60
      });
    }
    if (action === 'messages' && method === 'POST') {
      const role = (await one('SELECT role FROM members WHERE conversation=? AND user_id=?', id, u.id)).role;
      if (conv.type === 'group' && conv.only_admin && !['admin', 'mod'].includes(role)) fail(403, 'Este grupo permite mensajes solo de administradores y moderadores.');
      checkRate(req, 'message', 120, 60000);
      const b = await body(req);
      const type = b.type || 'text';
      if (!['text', 'image', 'audio'].includes(type)) fail(400, 'Tipo de mensaje inválido.');
      const text = String(b.text || '').trim();
      if (text.length > 5000 || !text && type === 'text') fail(400, 'Escribe un mensaje de hasta 5000 caracteres.');
      const mid = typeof b.id === 'string' && (/^[a-zA-Z0-9-]{20,80}$/).test(b.id) ? b.id : randomUUID();
      const existing = await one('SELECT * FROM messages WHERE id=?', mid);
      if (existing) {
        if (existing.sender !== u.id || existing.conversation !== id) fail(409, 'Identificador ocupado.');
        return json(res, {
          message: await messageView(existing)
        });
      }
      const reply = b.replyTo ? await one('SELECT id FROM messages WHERE id=? AND conversation=?', b.replyTo, id) : null;
      if (b.replyTo && !reply) fail(400, 'El mensaje citado ya no está disponible.');
      let file = null, mime = null, filename = null;
      if (type !== 'text') {
        const allowed = type === 'image' ? ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] : ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
        mime = String(b.mime || '').split(';')[0];
        if (!allowed.includes(mime) || typeof b.data !== 'string') fail(400, 'Formato de archivo no admitido.');
        const buffer = Buffer.from(b.data, 'base64');
        if (!buffer.length || buffer.length > (type === 'image' ? 4 : 6) * 1024 * 1024) fail(413, 'Máximo 4 MB por imagen y 6 MB por audio.');
        if (type === 'image' && !(mime === 'image/png' && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' || mime === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 || mime === 'image/gif' && buffer.subarray(0, 3).toString() === 'GIF' || mime === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP')) fail(400, 'La imagen no es válida.');
        file = randomUUID();
        filename = String(b.filename || type).slice(0, 120);
        await storage.put(file, buffer, mime);
      }
      const created = Math.max(stamp(), Number((await one('SELECT MAX(created) AS n FROM messages WHERE conversation=?', id)).n || 0) + 1);
      try {
        await run('INSERT INTO messages(id,conversation,sender,text,type,file,mime,filename,reply_to,created) VALUES(?,?,?,?,?,?,?,?,?,?)', mid, id, u.id, text, type, file, mime, filename, reply?.id || null, created);
      } catch (e) {
        if (file) await storage.remove(file);
        throw e;
      }
      const message = await messageView(await one('SELECT * FROM messages WHERE id=?', mid));
      notify(await memberIds(id), 'message', {
        conversation: id,
        message
      });
      return json(res, {
        message
      }, 201);
    }
    if (action === 'read' && method === 'POST') {
      const readAt = Math.max(stamp(), Number((await one('SELECT MAX(created) AS n FROM messages WHERE conversation=?', id)).n || 0));
      await run('UPDATE members SET read_at=? WHERE conversation=? AND user_id=?', readAt, id, u.id);
      notify(await memberIds(id), 'read', {
        conversation: id,
        user: u.id
      });
      return json(res, {
        ok: true
      });
    }
    if (action === 'typing' && method === 'POST') {
      notify((await memberIds(id)).filter(v => v !== u.id), 'typing', {
        conversation: id,
        user: u.id,
        name: u.name
      });
      return json(res, {
        ok: true
      });
    }
    if (!action && method === 'PATCH') {
      const own = await one('SELECT role FROM members WHERE conversation=? AND user_id=?', id, u.id);
      if (conv.type !== 'group' || own.role !== 'admin') fail(403, 'Solo la persona que creó el grupo puede editarlo.');
      const b = await body(req);
      const title = b.title === undefined ? conv.title : String(b.title || '').trim();
      if (title.length < 2 || title.length > 70) fail(400, 'Nombre de grupo inválido.');
      if (b.onlyAdminWrite !== undefined && typeof b.onlyAdminWrite !== 'boolean') fail(400, 'Permiso de escritura inválido.');
      let groupIcon = conv.icon, groupMime = conv.icon_mime;
      if (b.iconData) {
        groupMime = String(b.mime || '');
        const buffer = Buffer.from(String(b.iconData), 'base64');
        if (!buffer.length || buffer.length > 4 * 1024 * 1024) fail(413, 'Máximo 4 MB por imagen.');
        const valid = groupMime === 'image/png' && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' || groupMime === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 || groupMime === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
        if (!valid) fail(400, 'Usa una imagen PNG, JPG o WebP válida.');
        groupIcon = randomUUID();
        await storage.put(groupIcon, buffer, groupMime);
      }
      try {
        await run('UPDATE conversations SET title=?,only_admin=?,icon=?,icon_mime=? WHERE id=?', title, b.onlyAdminWrite === undefined ? conv.only_admin : Number(b.onlyAdminWrite), groupIcon, groupMime, id);
      } catch (error) {
        if (groupIcon !== conv.icon) await storage.remove(groupIcon);
        throw error;
      }
      if (groupIcon !== conv.icon && conv.icon) await storage.remove(conv.icon);
      notify(await memberIds(id), 'conversations', {});
      return json(res, {
        ok: true
      });
    }
    if (action === 'members' && method === 'POST') {
      if (conv.type !== 'group' || (await one('SELECT role FROM members WHERE conversation=? AND user_id=?', id, u.id)).role !== 'admin') fail(403, 'Solo la persona que creó el grupo puede añadir miembros.');
      const b = await body(req);
      const ids = [...new Set(Array.isArray(b.members) ? b.members : [])];
      if (ids.length + (await memberIds(id)).length > 30 || ids.some(x => typeof x !== 'string')) fail(400, 'Miembros inválidos o límite de 30 alcanzado.');
      for (const uid of ids) if (!await one('SELECT 1 FROM users WHERE id=?', uid)) fail(400, 'Cuenta no encontrada.');
      for (const uid of ids) await run('INSERT INTO members(conversation,user_id) VALUES(?,?) ON CONFLICT DO NOTHING', id, uid);
      notify(await memberIds(id), 'conversations', {});
      return json(res, {
        ok: true
      });
    }
    if (action === 'members' && ['PATCH', 'DELETE'].includes(method)) {
      if (conv.type !== 'group' || (await one('SELECT role FROM members WHERE conversation=? AND user_id=?', id, u.id)).role !== 'admin') fail(403, 'Solo un administrador puede gestionar miembros.');
      const b = await body(req), target = await one('SELECT role FROM members WHERE conversation=? AND user_id=?', id, String(b.userId || ''));
      if (!target) fail(404, 'Miembro no encontrado.');
      if (b.userId === u.id) fail(400, 'Para salir del grupo usa la opción Salir del grupo.');
      const recipients = await memberIds(id);
      if (method === 'DELETE') await run('DELETE FROM members WHERE conversation=? AND user_id=?', id, b.userId); else {
        if (!['admin', 'mod', 'member'].includes(b.role)) fail(400, 'Rol inválido.');
        await run('UPDATE members SET role=? WHERE conversation=? AND user_id=?', b.role, id, b.userId);
      }
      notify(recipients, 'conversations', {});
      return json(res, {
        ok: true
      });
    }
    if (!action && method === 'DELETE') {
      if (conv.type !== 'group') fail(400, 'Solo puedes salir de un grupo.');
      const ids = await memberIds(id);
      await run('DELETE FROM members WHERE conversation=? AND user_id=?', id, u.id);
      if ((await memberIds(id)).length && !await one('SELECT 1 FROM members WHERE conversation=? AND role=?', id, 'admin')) await run('UPDATE members SET role=? WHERE conversation=? AND user_id=?', 'admin', id, (await memberIds(id))[0]);
      notify(ids, 'conversations', {});
      return json(res, {
        ok: true
      });
    }
  }
  const groupIcon = p.match(/^\/api\/group-icons\/([^/]+)$/);
  if (groupIcon && method === 'GET') {
    const c = await requireMember(decodeURIComponent(groupIcon[1]), u.id);
    if (!c.icon) fail(404, 'Imagen no disponible.');
    const buffer = await storage.get(c.icon);
    res.writeHead(200, {
      'Content-Type': c.icon_mime,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store'
    });
    res.end(buffer);
    return;
  }
  const msg = p.match(/^\/api\/messages\/([^/]+)(?:\/(reaction))?$/);
  if (msg) {
    const m = await one('SELECT * FROM messages WHERE id=?', msg[1]);
    if (!m) fail(404, 'Mensaje no encontrado.');
    await requireMember(m.conversation, u.id);
    if (msg[2] === 'reaction' && method === 'POST') {
      const b = await body(req);
      if (!['❤️', '👍', '👎', '😂', '😮', '😡', '😢', '🔥', '💩', '🤮', '❓'].includes(b.emoji) || m.deleted) fail(400, 'Reacción inválida.');
      const previous = await one('SELECT emoji FROM reactions WHERE message=? AND user_id=?', m.id, u.id);
      if (previous?.emoji === b.emoji) await run('DELETE FROM reactions WHERE message=? AND user_id=?', m.id, u.id); else await run('INSERT INTO reactions VALUES(?,?,?) ON CONFLICT(message,user_id) DO UPDATE SET emoji=excluded.emoji', m.id, u.id, b.emoji);
    } else if (method === 'DELETE' && !msg[2]) {
      if (m.sender !== u.id) fail(403, 'Solo puedes eliminar tus mensajes.');
      await run("UPDATE messages SET deleted=1,text='',edited=? WHERE id=?", stamp(), m.id);
      if (m.file) await storage.remove(m.file);
    } else if (method === 'PATCH' && !msg[2]) {
      if (m.sender !== u.id || m.type !== 'text' || m.deleted) fail(403, 'Solo puedes editar tus mensajes de texto.');
      const b = await body(req);
      const text = String(b.text || '').trim();
      if (!text || text.length > 5000) fail(400, 'Texto inválido.');
      await run('UPDATE messages SET text=?,edited=? WHERE id=?', text, stamp(), m.id);
    } else fail(405, 'Acción no disponible.');
    const message = await messageView(await one('SELECT * FROM messages WHERE id=?', m.id));
    notify(await memberIds(m.conversation), 'message', {
      conversation: m.conversation,
      message
    });
    return json(res, {
      message
    });
  }
  const file = p.match(/^\/api\/files\/([^/]+)$/);
  if (file && method === 'GET') {
    const m = await one('SELECT * FROM messages WHERE id=? AND deleted=0', file[1]);
    if (!m?.file) fail(404, 'Archivo no encontrado.');
    await requireMember(m.conversation, u.id);
    const buffer = await storage.get(m.file);
    res.writeHead(200, {
      'Content-Type': m.mime,
      'Content-Length': buffer.length,
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(m.filename || 'archivo')}`
    });
    res.end(buffer);
    return;
  }
  fail(404, 'No se encontró esta función.');
}
let writeQueue = Promise.resolve();
async function dispatchApi(req, res, url) {
  if (['GET', 'HEAD'].includes(req.method)) return api(req, res, url);
  const previous = writeQueue;
  let release;
  writeQueue = new Promise(resolve => {
    release = resolve;
  });
  await previous;
  try {
    return await api(req, res, url);
  } finally {
    release();
  }
}
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await dispatchApi(req, res, url);
    if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Método no permitido.');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filename = path.resolve(publicDir, '.' + relative);
    if (!filename.startsWith(publicDir + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) fail(404, 'Página no encontrada.');
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': (/\.(html|js|css|json)$/).test(filename) ? 'no-cache' : 'public, max-age=86400'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filename).pipe(res);
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    const status = error.status || 500;
    if (status === 500) console.error(error);
    json(res, {
      error: status === 500 ? 'No se pudo completar la operación. Intenta nuevamente.' : error.message
    }, status);
  }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log(`The Xpedition · http://localhost:${server.address().port}\nBase de datos: ${db.kind} · archivos: ${storage.kind}`));
setInterval(async () => {
  try {
    await run('DELETE FROM sessions WHERE expires<?', stamp());
  } catch (error) {
    console.error('No se pudieron limpiar sesiones:', error.code || 'DATABASE_ERROR');
  }
  for (const [key, value] of limits) if (value.until < stamp()) limits.delete(key);
}, 60000).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const set of events.values()) for (const stream of set) stream.res.end();
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
});
