(() => {
  'use strict';
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  let installPrompt = null;
  let installed = false;
  let installing = false;
  let dialog;

  function sync() {
    document.documentElement.classList.toggle('xp-installed',
      installed || displayMode.matches || navigator.standalone === true);
    if (!dialog) return;
    dialog.querySelector('[data-install-native]').hidden = !installPrompt;
  }

  function showInstructions() {
    if (document.documentElement.classList.contains('xp-installed')) return;
    document.querySelector('.account-menu')?.remove();
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'xp-install-dialog';
      dialog.setAttribute('aria-labelledby', 'xpInstallTitle');
      dialog.setAttribute('aria-describedby', 'xpInstallDescription');
      let steps;
      if (isApple) {
        steps = '<li>Abre esta página en <strong>Safari</strong> y toca <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li><li>Elige <strong>Agregar a Inicio</strong> o <strong>Añadir a pantalla de inicio</strong>.</li><li>Si aparece <strong>Abrir como app web</strong>, déjalo activado y toca <strong>Agregar</strong>.</li>';
      } else if (isAndroid) {
        steps = '<li>Abre esta página en <strong>Chrome</strong>.</li><li>Toca el menú de <strong>tres puntos ⋮</strong> y elige <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</li><li>Confirma la instalación y abre <strong>The Xpedition</strong> desde su nuevo icono.</li>';
      } else {
        steps = '<li>Busca el icono de <strong>instalación</strong> en la barra de direcciones de Chrome o Edge.</li><li>También puedes abrir el menú del navegador y buscar <strong>Instalar The Xpedition</strong>.</li><li>En tu celular, abre esta página: en iPhone usa <strong>Compartir → Agregar a Inicio</strong>; en Android, <strong>⋮ → Instalar app</strong>.</li>';
      }
      dialog.innerHTML = `<section class="xp-install-panel"><button type="button" class="xp-install-close" data-install-close aria-label="Cerrar instalación">×</button><img class="xp-install-logo" src="/brand/xpedition-transparent-v2-192.png" alt="" width="72" height="72"><span class="xp-install-eyebrow">EL UNIVERSO, CONTIGO</span><h2 id="xpInstallTitle">The Xpedition.<br>Ahora en tu inicio.</h2><p id="xpInstallDescription">Tu comunidad y los simuladores en su propia ventana, con un acceso directo desde tu celular.</p><span class="xp-install-tag">Gratis · Comunidad y simuladores</span><button type="button" class="xp-install-primary" data-install-native hidden>Instalar The Xpedition <span aria-hidden="true">↓</span></button><ol class="xp-install-steps">${steps}</ol><p class="xp-install-note">La app necesita conexión a internet. Se actualiza con la página.</p><p class="xp-install-status" role="status" aria-live="polite"></p></section>`;
      document.body.append(dialog);
      dialog.addEventListener('click', event => {
        if (event.target === dialog || event.target.closest('[data-install-close]')) dialog.close();
        if (event.target.closest('[data-install-native]')) install();
      });
    }
    sync();
    if (!dialog.open) dialog.showModal();
  }

  async function install() {
    if (!installPrompt || installing) return;
    installing = true;
    const prompt = installPrompt;
    installPrompt = null;
    const button = dialog.querySelector('[data-install-native]');
    button.disabled = true;
    const status = dialog.querySelector('.xp-install-status');
    try {
      // Keep the native prompt directly attached to the user's tap.
      const result = await prompt.prompt();
      const choice = await (prompt.userChoice || result);
      if (choice?.outcome === 'accepted') {
        status.textContent = 'Instalación aceptada. Busca The Xpedition entre tus apps.';
      } else {
        status.textContent = 'Puedes instalarla más adelante desde el menú de tu navegador.';
      }
    } catch {
      status.textContent = 'Abre el menú de tu navegador y sigue los pasos de arriba para instalarla.';
    } finally {
      installing = false;
      button.disabled = false;
      sync();
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    sync();
    dialog?.close();
  });
  displayMode.addEventListener?.('change', sync);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-install-app]')) showInstructions();
  });
  sync();
})();
