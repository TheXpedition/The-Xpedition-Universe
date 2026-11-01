// Measured bounds of the original PNG artwork. The illustrated sheet is not a
// uniform grid: a 6 × 6 CSS background crop cuts off fish and shows neighbours.
export const ITEM_ATLAS_SIZE=1254;
export const ITEM_ART_RECTS=Object.freeze([
 [81,53,69,148],[236,16,150,195],[425,40,186,161],[642,23,186,193],[870,26,136,170],[1108,16,94,195],
 [62,222,95,210],[267,222,98,210],[471,222,91,211],[625,251,211,168],[889,208,104,227],[1054,241,182,183],
 [12,452,198,173],[225,450,191,175],[439,457,180,171],[653,457,137,165],[811,445,222,181],[1044,452,203,170],
 [42,650,158,184],[244,654,157,171],[436,652,159,176],[634,646,185,184],[862,644,171,196],[1032,631,218,203],
 [22,868,205,156],[275,845,85,183],[427,838,168,196],[627,878,191,151],[860,848,164,190],[1044,851,196,191],
 [16,1055,157,166],[220,1053,153,170],[414,1054,167,164],[582,1058,245,162],[817,1048,206,182],[1027,1050,218,177]
].map(rect=>Object.freeze(rect)));
// Fish and steak have overlapping rectangular bounds. Separate their outlines
// without trimming the fish's head/tail or exposing the neighbouring steak.
export const ITEM_ART_MASKS=Object.freeze({
 33:Object.freeze([[582,1058],[827,1058],[827,1112],[813,1115],[813,1220],[582,1220]]),
 34:Object.freeze([[836,1048],[1023,1048],[1023,1230],[817,1230],[817,1120],[836,1116]])
});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function itemAtlasArt(index,{className='',label='Objeto'}={}){
 const rect=ITEM_ART_RECTS[index];if(!rect)return '';
 const [left,top,width,height]=rect,clip='item-art-clip-'+index,mask=ITEM_ART_MASKS[index];
 const shape=mask?'<polygon points="'+mask.map(([x,y])=>(x-left)+','+(y-top)).join(' ')+'"/>':'<rect width="'+width+'" height="'+height+'"/>';
 return '<svg class="survival-item-art '+escape(className)+'" data-item-art="'+index+'" viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+escape(label)+'" style="background:none;overflow:hidden"><defs><clipPath id="'+clip+'">'+shape+'</clipPath></defs><g clip-path="url(#'+clip+')"><image href="/juegos/survival/survival-atlas.png?v=items-20261028-2" x="'+(-left)+'" y="'+(-top)+'" width="'+ITEM_ATLAS_SIZE+'" height="'+ITEM_ATLAS_SIZE+'"/></g></svg>';
}
