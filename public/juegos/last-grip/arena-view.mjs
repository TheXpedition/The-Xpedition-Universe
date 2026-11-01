// Only the explicit watch button opts out. Movement, falls and result packets
// never change the camera. A new round brings everyone back to the arena.
export class ArenaView {
 constructor({read=()=>null,write=()=>{}}={}){this.read=read;this.write=write;this.roundKey=null;this.watching=false;}
 sync(s){const key=s.id+':'+s.round?.id;if(['active','ending'].includes(s.phase)&&key!==this.roundKey){this.roundKey=key;this.watching=this.read('grip-arena-left:'+key)!=='yes';}if(['closed','lobby','finished'].includes(s.phase)){this.watching=false;this.roundKey=null;}return this.watching;}
 toggle(){this.watching=!this.watching;if(this.roundKey)this.write('grip-arena-left:'+this.roundKey,this.watching?'no':'yes');return this.watching;}
}
