// Relative drawing heights measured from the supplied full-cast lineup.
// Bruno is the 200-unit reference. These are illustration units, not centimeters.
export const CAST_HEIGHTS=Object.freeze({'maria-villegas':181,sallua:201,carmine:211,bruno:200,daelly:177,bayron:194,arisantana:196,marianito:197,leandro:201,vitany:194,kareli:188,vita:187,eduard:201,alice:178,joseserna:207,guillermo:214,peggy:190,andromeda:184,ivy:191,roger:214,isabel:200,dani:185,'dua-lingo':181});
export const castHeightRatio=id=>(CAST_HEIGHTS[id]||200)/200;
// Atlas pixels use the same three-quarter left-facing basis as the source PNG.
export const spriteMirror=(facing=1)=>facing===-1?1:-1;
