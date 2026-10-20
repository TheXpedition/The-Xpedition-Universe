'use strict';
(() => {
  let context = null, simStream = null, session = null, armed = false;
  const mainSite = typeof startStream === 'function';
  const enabled = () => { try { return localStorage.getItem('xp-message-sound') !== 'off'; } catch { return true; } };
  function audioContext() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    try { if (!context || context.state === 'closed') context = new Audio(); return context; } catch { return null; }
  }
  async function arm() {
    const audio = audioContext();
    if (!audio) return;
    // Safari may leave the audio session interrupted after backgrounding or a call.
    try {
      if (audio.createBufferSource && !armed) {
        const source = audio.createBufferSource();
        source.buffer = audio.createBuffer(1, 1, 22050);
        source.connect(audio.destination); source.start(0);
      }
      if (audio.state !== 'running') await audio.resume();
      armed = audio.state === 'running';
    } catch {}
  }
  document.addEventListener('pointerdown', arm, { passive: true });
  document.addEventListener('touchend', arm, { passive: true });
  document.addEventListener('keydown', arm, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && armed) void arm(); });
  function tone(force = false) {
    const audio = audioContext();
    if (!armed || (!force && !enabled()) || !audio || audio.state !== 'running') return false;
    const start = audio.currentTime;
    for (const [offset, hz] of [[0, 740], [.13, 988]]) {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(0, start + offset);
      gain.gain.linearRampToValueAtTime(.11, start + offset + .015);
      gain.gain.exponentialRampToValueAtTime(.001, start + offset + .2);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start + offset); oscillator.stop(start + offset + .22);
    }
    return true;
  }
  window.XpeditionMessageSound = {
    get enabled() { return enabled(); },
    setEnabled(value) { try { localStorage.setItem('xp-message-sound', value ? 'on' : 'off'); } catch {} },
    async preview() { await arm(); return tone(true); }
  };
  async function incoming(event, ownId) {
    let payload;
    try { payload = JSON.parse(event.data); } catch { return; }
    const message = payload.message;
    if (!ownId || !message?.id || message.sender?.id === ownId || message.deleted || message.type === 'deleted' || document.hidden || window.XpeditionPush?.active) return;
    const notify = () => {
      if (!armed || audioContext()?.state !== 'running' || !enabled()) return;
      let seen = [];
      try { const saved = JSON.parse(localStorage.getItem('xp-message-sounds') || '[]'); if (Array.isArray(saved)) seen = saved; } catch {}
      if (seen.includes(message.id)) return;
      if (tone()) try { localStorage.setItem('xp-message-sounds', JSON.stringify([...seen.slice(-79), message.id])); } catch {}
    };
    try { if (navigator.locks) await navigator.locks.request('xpedition-message-sound', notify); else notify(); } catch {}
  }
  if (mainSite) {
    const original = startStream;
    startStream = function () { original(); state.stream?.addEventListener('message', event => void incoming(event, state.user?.id)); };
  }
  function connectSimulator() {
    if (mainSite || !session || simStream) return;
    simStream = new EventSource('/api/events');
    simStream.addEventListener('message', event => void incoming(event, session));
  }
  window.addEventListener('xp:session', event => {
    const id = event.detail?.id;
    if (id === session) return;
    simStream?.close(); simStream = null; session = id;
    connectSimulator();
  });
  window.addEventListener('pagehide', () => { simStream?.close(); simStream = null; });
  window.addEventListener('pageshow', connectSimulator);
})();
