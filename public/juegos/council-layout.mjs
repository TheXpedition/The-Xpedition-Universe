import {APOCALYPSE_ASSETS} from './apocalypse-assets.mjs';
import {ART_SCALE,FRONT_Y} from './front-world.mjs';
const asset=APOCALYPSE_ASSETS.eliminacion,W=asset.width*ART_SCALE,H=asset.height*ART_SCALE/FRONT_Y;
export const COUNCIL_PRESENTER=Object.freeze({x:W*.5,y:H*.585,z:0,height:186*1.35*1.04});
export const COUNCIL_BANKS=Object.freeze(['left','right'].map(side=>{const x=side==='left'?.23:.77,facing=side==='left'?1:-1;return {id:'seating-'+side,x:x*W,facing,startY:H*.63,seats:Array.from({length:8},(_,i)=>({x:(x+(side==='left'?-1:1)*(i%4)*.043)*W,y:(.63-Math.floor(i/4)*.085)*H,facing}))};}));
export function councilSeat(index){const bank=COUNCIL_BANKS[index%2],slot=Math.floor(index/2)%8,p=bank.seats[slot];return {...p,propId:bank.id,slot,stand:{x:p.x,y:H*.795}};}
export const councilAssembly=index=>({x:W*(.32+index%4*.12),y:H*(.84+Math.floor(index/4)*.025)});
