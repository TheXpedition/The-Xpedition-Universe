export function fishingGeometry(player,height,time){
 const side=(player.fishingTarget?.x??player.x+height)>player.x?1:-1,bob=Math.sin(time*2)*height*.008;
 const hand={x:player.x+side*height*.13,y:player.y*.62-height*.43};
 const tip={x:player.x+side*height*.45,y:player.y*.62-height*.86+bob};
 const water={x:player.fishingTarget?.x??player.x+side*height*.9,y:(player.fishingTarget?.y??player.y)*.62};
 return {side,hand,tip,water};
}
export function paintFishingGear(c,p,height,time,reduced=false){
 const {side,hand,tip,water}=fishingGeometry(p,height,reduced?0:time),r=height*.016;
 c.save();c.lineCap='round';c.strokeStyle='#171512';c.lineWidth=height*.018;c.beginPath();c.moveTo(hand.x-side*height*.08,hand.y+height*.14);c.quadraticCurveTo(hand.x,hand.y,tip.x,tip.y);c.stroke();c.strokeStyle='#9a7046';c.lineWidth=height*.009;c.stroke();
 c.fillStyle='#b3a383';c.beginPath();c.arc(hand.x,hand.y,r*1.4,0,Math.PI*2);c.fill();
 c.strokeStyle='#e6d6b4bb';c.lineWidth=1.1;c.beginPath();c.moveTo(tip.x,tip.y);c.quadraticCurveTo((tip.x+water.x)/2,tip.y+height*.15,water.x,water.y);c.stroke();
 c.fillStyle='#db6138';c.fillRect(water.x-r*.4,water.y-r,r*.8,r);c.fillStyle='#f2e2c7';c.fillRect(water.x-r*.4,water.y-r*1.6,r*.8,r*.7);
 for(let i=0;i<3;i++){const phase=((reduced?.4:time*.45)+i/3)%1;c.globalAlpha=(1-phase)*.65;c.strokeStyle='#e1ce9e';c.beginPath();c.ellipse(water.x,water.y,height*(.02+phase*.12),height*(.008+phase*.025),0,0,Math.PI*2);c.stroke();}c.restore();
}
