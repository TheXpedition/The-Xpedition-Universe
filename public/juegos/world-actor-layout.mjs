import {castHeightRatio} from './world-cast-proportions.mjs';
import {swimmingPose} from './world-swimming-art.mjs';
export function actorWorldHeight(map,characterId){return (map.avatarHeight||186)*1.35*castHeightRatio(characterId);}
export function actorVisibleBounds(player,height,{time=0,reducedMotion=false}={}){
 if(player.swimming)return swimmingPose(player,height,time,reducedMotion);
 const y=player.y*.62-(player.z||0),seated=player.state==='sit';
 return {x:player.x,y,left:player.x-height*.30,right:player.x+height*.30,top:y-height*(seated?.75:1),bottom:y+8};
}
