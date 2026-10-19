import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync(new URL('../public/install-app.js', import.meta.url), 'utf8');
function browser({ apple = false, standalone = false } = {}) {
  const dom = new JSDOM('<button data-install-app>Instalar app</button>', {
    url: 'https://the-xpedition-universe.onrender.com/', runScripts: 'outside-only'
  });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'userAgent', { value: apple ? 'iPhone Safari' : 'Android Chrome' });
  Object.defineProperty(w.navigator, 'standalone', { value: standalone });
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.eval(source);
  return { dom, w, open() { w.document.querySelector('[data-install-app]').click(); } };
}

test('la app usa un ámbito común para comunidad y simuladores y cumple los requisitos de instalación', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/site.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.id, '/');
  assert(manifest.start_url.startsWith('/'));
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    assert(icon);
    assert(fs.existsSync(new URL('../public' + icon.src, import.meta.url)));
  }
  for (const page of ['index.html', 'simulator/index.html', 'simulator/game/index.html', 'simulator/house/index.html', 'simulator/traitor/index.html']) {
    const html = fs.readFileSync(new URL('../public/' + page, import.meta.url), 'utf8').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    const dom = new JSDOM(html), document = dom.window.document;
    assert.equal(document.querySelector('[rel="manifest"]').getAttribute('href'), '/site.webmanifest');
    assert.equal(document.querySelector('[name="apple-mobile-web-app-capable"]').content, 'yes');
    dom.window.close();
  }
});

test('iPhone muestra instrucciones de Safari sin inventar un instalador nativo', () => {
  const b = browser({ apple: true });
  try {
    b.open();
    const dialog = b.w.document.querySelector('dialog');
    assert(dialog.open);
    assert(dialog.textContent.includes('Safari'));
    assert(dialog.textContent.includes('Abrir como app web'));
    assert(dialog.querySelector('[data-install-native]').hidden);
    dialog.querySelector('[data-install-close]').click();
    assert.equal(dialog.open, false);
  } finally { b.w.close(); }
});

test('el aviso nativo solo se abre con un toque y no se reutiliza después de descartarlo', async () => {
  const b = browser();
  try {
    let calls = 0;
    const event = new b.w.Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { calls++; return { outcome: 'dismissed' }; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    b.w.dispatchEvent(event);
    assert(event.defaultPrevented);
    assert.equal(calls, 0);
    b.open();
    const button = b.w.document.querySelector('[data-install-native]');
    assert.equal(button.hidden, false);
    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(calls, 1);
    assert(button.hidden);
    assert(b.w.document.querySelector('[role="status"]').textContent.includes('más adelante'));
    button.click();
    assert.equal(calls, 1);
  } finally { b.w.close(); }
});

test('la instalación oculta la oferta y la vista ya instalada no vuelve a mostrarla', () => {
  const b = browser();
  try {
    b.open();
    b.w.dispatchEvent(new b.w.Event('appinstalled'));
    assert(b.w.document.documentElement.classList.contains('xp-installed'));
    assert.equal(b.w.document.querySelector('dialog').open, false);
    b.open();
    assert.equal(b.w.document.querySelector('dialog').open, false);
  } finally { b.w.close(); }
  const installed = browser({ apple: true, standalone: true });
  try {
    installed.open();
    assert(installed.w.document.documentElement.classList.contains('xp-installed'));
    assert.equal(installed.w.document.querySelector('dialog'), null);
  } finally { installed.w.close(); }
});
