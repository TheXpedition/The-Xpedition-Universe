// Shared ink icons. Labels remain visible; the pictogram never carries the action alone.
const art={
 home:'<path class="icon-fill" d="m3 11 9-8 9 8v10H3Z"/><path d="m2 11 10-9 10 9M5 10v11h14V10M10 21v-7h5v7M7 7V3h3"/>',
 explore:'<path class="icon-fill" d="m12 2 9 10-9 10L3 12Z"/><path d="m12 2 9 10-9 10L3 12ZM16 8l-3 7-5 1 3-7Z"/><path d="M12 4v2M18 12h2M12 18v2M4 12h2"/>',
 people:'<path class="icon-fill" d="M2 20v-3l5-3 5 2 5-2 5 3v3Z"/><path d="M8 21v-4l4-3 4 3v4M2 20v-4l4-2M22 20v-4l-4-2"/><circle cx="12" cy="9" r="3"/><path d="M6 11a3 3 0 1 1 0-6M18 5a3 3 0 1 1 0 6"/>',
 map:'<path class="icon-fill" d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2Z"/><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2ZM9 3v15M15 6v15"/><path d="m5 12 2-2m4 1 2 2m4-1 2-2"/>',
 trophy:'<path class="icon-fill" d="M8 3h8v7l-4 4-4-4Z"/><path d="M8 3h8v7l-4 4-4-4ZM8 5H4v3l4 3M16 5h4v3l-4 3M12 14v5M8 21h8M9 19h6"/><path d="m12 6 1 2 2 .3-1.5 1.4.3 2-1.8-1-1.8 1 .3-2L9 8.3l2-.3Z"/>',
 backpack:'<path d="M8 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M7 5h10a3 3 0 0 1 3 3v13H4V8a3 3 0 0 1 3-3ZM4 11H2v8h2M20 11h2v8h-2M8 13h8v6H8ZM8 9h8M11 15h2"/>',
 bag:'<path class="icon-fill" d="M6 7h12l3 14H3Z"/><path d="M6 7h12l3 14H3ZM9 7V5l2-2h2l2 2v2M8 12h8v6H8ZM6 8l1 3M18 8l-1 3"/>',
 shield:'<path class="icon-fill" d="m12 2 8 3v7l-3 5-5 5-5-5-3-5V5Z"/><path d="m12 2 8 3v7l-3 5-5 5-5-5-3-5V5Z"/><path d="m8 12 3 3 5-6M7 7l5-2 5 2"/>',
 volume:'<path class="icon-fill" d="M3 9h4l5-5v16l-5-5H3Z"/><path d="M3 9h4l5-5v16l-5-5H3ZM16 8q5 4 0 8M19 4q9 8 0 16"/>',
 muted:'<path d="M3 9h4l5-5v16l-5-5H3ZM17 9l5 6M22 9l-5 6"/>',
 chat:'<path class="icon-fill" d="M3 4h18v13H9l-6 4Z"/><path d="M3 4h18v13H9l-6 4ZM7 8h10M7 12h7"/>',
 message:'<path class="icon-fill" d="M3 5h18v15H3Z"/><path d="M3 5h18v15H3ZM3 5l9 8 9-8M3 20l6-7M21 20l-6-7"/>',
 smile:'<circle class="icon-fill" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8 9h1M15 9h1M7 14q5 6 10 0"/>',
 send:'<path class="icon-fill" d="m3 3 19 9-19 9 4-9Z"/><path d="m3 3 19 9-19 9 4-9ZM7 12h15"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 arrow:'<path d="M3 12h17m-6-6 6 6-6 6"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 camera:'<path class="icon-fill" d="M3 7h4l2-3h6l2 3h4v14H3Z"/><path d="M3 7h4l2-3h6l2 3h4v14H3Z"/><circle cx="12" cy="13" r="4"/>',
 clipboard:'<path class="icon-fill" d="M5 5h14v17H5Z"/><path d="M8 5H5v17h14V5h-3M9 2h6v5H9ZM8 12h8M8 16h6"/>',
 history:'<path d="M3 8a9 9 0 1 1 0 9M3 3v6h6M12 7v6l4 2"/>',
 door:'<path class="icon-fill" d="m7 3 10 2v17l-10-2Z"/><path d="M3 21V3h14m-10 0 10 2v17l-10-2ZM13 12h1M19 8l3 3-3 3M18 11h4"/>',
 chair:'<path class="icon-fill" d="M6 3h12v10H6Z"/><path d="M6 3h12v10H6ZM4 13h16v4H4ZM6 17v5M18 17v5M8 6h8"/>',
 lamp:'<path class="icon-fill" d="M7 5h10l3 11H4Z"/><path d="M7 5h10l3 11H4ZM12 2v3M8 16v6h8v-6M9 22h6"/>',
 lock:'<path class="icon-fill" d="M5 10h14v11H5Z"/><path d="M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>'
};
export function worldIcon(name){return `<svg class="world-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${art[name]||art.explore}</svg>`;}
export function mountWorldIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=worldIcon(el.dataset.icon));}
