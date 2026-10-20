(() => {
  'use strict';
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const needsInstall = () => apple && !standalone();
  const supported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  let userId = null, registration = null, config = null, preparation = null, active = false, busy = false, dialog = null;
  const choiceKey = () => 'xp-push-choice:' + userId;
  const remember = value => { try { localStorage.setItem(choiceKey(), value); } catch {} };
  const choice = () => { try { return localStorage.getItem(choiceKey()); } catch { return null; } };
  window.XpeditionPush = { get active() { return active; } };

  async function request(path, method = 'GET', data) {
    const response = await fetch('/api/push/' + path, { method, credentials: 'same-origin', cache: 'no-store',
      ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo configurar este dispositivo.');
    return result;
  }
  async function prepare() {
    if (!supported() || needsInstall()) return;
    if (!preparation) preparation = Promise.all([
      navigator.serviceWorker.register('/push-worker.js', { scope: '/' }), request('config')
    ]).then(async ([worker, settings]) => {
      registration = worker;
      config = settings;
      await navigator.serviceWorker.ready;
    }).catch(error => { preparation = null; throw error; });
    await preparation;
  }
  const decodeKey = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
  async function saveSubscription(id) {
    await prepare();
    if (id !== userId) return;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.publicKey) });
    if (id !== userId) { await subscription.unsubscribe(); return; }
    await request('subscription', 'POST', { userId: id, subscription: subscription.toJSON() });
    active = true;
    remember('enabled');
    document.querySelector('.xp-push-invite')?.remove();
  }
  function update(message) {
    if (!dialog) return;
    const detail = dialog.querySelector('.xp-push-detail');
    const enable = dialog.querySelector('[data-push-action="enable"]');
    const permission = 'Notification' in window ? Notification.permission : 'default';
    detail.textContent = !userId ? 'Inicia sesión para recibir avisos de tus conversaciones.' : needsInstall() ?
      'En iPhone o iPad, instala The Xpedition en Inicio y ábrela desde su icono. Después podrás dar permiso para recibir avisos.' :
      !supported() ? 'Este navegador no permite avisos del sistema. Usa Chrome en Android o la app instalada en iPhone con iOS 16.4 o posterior.' :
      permission === 'denied' ? 'Los avisos están bloqueados. Permítelos en los ajustes de notificaciones de esta app o sitio y vuelve a abrirla.' :
      active ? 'Este dispositivo recibirá los nuevos mensajes, incluso con la página cerrada.' :
      'Recibe un aviso con el nombre de quien te escribe y entra directamente a su conversación.';
    enable.hidden = !userId || needsInstall() || !supported() || permission === 'denied' || active;
    enable.disabled = busy || !registration || !config;
    enable.textContent = busy ? 'Activando…' : !registration || !config ? 'Preparando este dispositivo…' : 'Activar avisos';
    dialog.querySelector('[data-push-action="install"]').hidden = !userId || !needsInstall();
    for (const action of ['disable', 'test']) dialog.querySelector('[data-push-action="' + action + '"]').hidden = !active;
    dialog.querySelector('.xp-push-status').textContent = message || '';
    const sound = dialog.querySelector('[data-push-sound]');
    sound.checked = window.XpeditionMessageSound?.enabled !== false;
  }
  function settings() {
    document.querySelector('.account-menu')?.remove();
    document.querySelector('.sim-account-menu')?.remove();
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'xp-push-dialog';
      dialog.setAttribute('aria-labelledby', 'xpPushTitle');
      dialog.innerHTML = '<section class="xp-push-panel"><button class="xp-push-close" data-push-action="close" aria-label="Cerrar notificaciones">×</button><span class="xp-push-eyebrow">QUE NO SE TE ESCAPE NADA</span><h2 id="xpPushTitle">Tu gente,<br>más cerca.</h2><p class="xp-push-detail"></p><button class="xp-push-primary" data-push-action="enable">Activar avisos</button><button class="xp-push-primary" data-push-action="install" hidden>Instalar en mi celular</button><div class="xp-push-actions"><button data-push-action="test" hidden>Enviar aviso de prueba</button><button data-push-action="disable" hidden>Desactivar en este dispositivo</button></div><div class="xp-push-sound"><label><input type="checkbox" data-push-sound> Sonido mientras uso la página</label><button data-push-action="sound">Probar sonido ♪</button></div><p class="xp-push-note">El celular decide el sonido y la presentación de la foto. Los avisos respetan sus ajustes de silencio y No molestar.</p><p class="xp-push-status" role="status" aria-live="polite"></p></section>';
      document.body.append(dialog);
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.querySelector('[data-push-sound]').addEventListener('change', event => window.XpeditionMessageSound?.setEnabled(event.target.checked));
    }
    update();
    if (!dialog.open) dialog.showModal();
    void prepare().then(() => update()).catch(error => update(error.message));
  }
  async function enable() {
    if (!userId || busy || !supported() || needsInstall() || !registration || !config) return;
    busy = true;
    const id = userId;
    try {
      // Must happen synchronously within the tap, before any awaited operation on iOS.
      const permissionRequest = Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
      update();
      const permission = await permissionRequest;
      if (permission !== 'granted') { remember('later'); update('Puedes cambiar esta decisión más adelante desde Notificaciones.'); return; }
      await saveSubscription(id);
      update('Avisos activados en este dispositivo.');
    } catch (error) { active = false; update(error.message); }
    finally { busy = false; update(dialog?.querySelector('.xp-push-status').textContent); }
  }
  async function disable() {
    try {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        try { await request('subscription', 'DELETE', { endpoint: subscription.endpoint }); }
        finally { await subscription.unsubscribe(); }
      }
      active = false; remember('disabled'); update('Avisos desactivados en este dispositivo.');
    } catch { active = false; remember('disabled'); update('Desactivados en el navegador. Si tienes otro dispositivo, sus avisos siguen siendo independientes.'); }
  }
  function invite() {
    if (!userId || ['enabled','later','disabled'].includes(choice()) || active || (!supported() && !needsInstall()) || location.hash.startsWith('#mensajes') || document.querySelector('.xp-push-invite')) return;
    const banner = document.createElement('aside');
    banner.className = 'xp-push-invite';
    banner.setAttribute('aria-label', 'Activar notificaciones de mensajes');
    banner.innerHTML = '<button class="xp-push-dismiss" data-push-action="later" aria-label="Ahora no">×</button><strong>Que no se te escape un mensaje.</strong><p>Activa los avisos en este dispositivo.</p><button class="xp-push-primary" data-push-action="invite">Activar avisos</button>';
    document.body.append(banner);
  }
  async function session(id) {
    if (id === userId) return;
    userId = id || null; active = false;
    document.querySelector('.xp-push-invite')?.remove();
    if (!userId) {
      try { await (await registration?.pushManager.getSubscription())?.unsubscribe(); } catch {}
      dialog?.close(); return;
    }
    const current = userId;
    try {
      await prepare();
      if (userId !== current) return;
      if (choice() === 'enabled' && 'Notification' in window && Notification.permission === 'granted') await saveSubscription(current);
      else {
        await (await registration?.pushManager.getSubscription())?.unsubscribe();
        invite();
      }
    } catch { if (choice() === 'enabled') remember('retry'); invite(); }
    update();
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-push-settings]')) { settings(); return; }
    const action = event.target.closest('[data-push-action]')?.dataset.pushAction;
    if (action === 'close') dialog?.close();
    if (action === 'later') { remember('later'); document.querySelector('.xp-push-invite')?.remove(); }
    if (action === 'invite') { settings(); if (!needsInstall()) void enable(); }
    if (action === 'enable') void enable();
    if (action === 'disable') void disable();
    if (action === 'install') { dialog.close(); window.XpeditionInstall?.open(); }
    if (action === 'sound') void window.XpeditionMessageSound?.preview();
    if (action === 'test') void (async () => {
      try {
        const subscription = await registration?.pushManager.getSubscription();
        if (!subscription) throw new Error('Vuelve a activar los avisos para hacer la prueba.');
        await request('test', 'POST', { endpoint: subscription.endpoint });
        update('Aviso de prueba enviado. Revisa las notificaciones del celular.');
      } catch (error) { update(error.message); }
    })();
  });
  window.addEventListener('xp:session', event => void session(event.detail?.id));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('xpedition-economy');
    channel.addEventListener('message', event => { if (event.data?.type === 'logout') void session(null); });
  }
  window.addEventListener('hashchange', invite);
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof state !== 'undefined' && state.user?.id) void session(state.user.id);
  });
})();
