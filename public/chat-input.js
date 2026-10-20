'use strict';
document.addEventListener('paste', event => {
  if (!state.user || !state.active || !event.target.closest('.composer')) return;
  const clipboard = event.clipboardData;
  if (!clipboard) return;
  const files = [...(clipboard.files || [])];
  for (const item of clipboard.items || []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file && !files.includes(file)) files.push(file);
    }
  }
  const image = files.find(file => file.type.startsWith('image/'));
  if (!image) return;
  event.preventDefault();
  stageChatAttachment(image);
});
