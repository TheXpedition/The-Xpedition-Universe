const ink='#244452';
function p(ctx,d,fill,stroke=ink,width=2){const path=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(path);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(path);}}
export function drawExpeditionFlag(ctx,kind,time,{reduced=false}={}){
 const sway=reduced?0:Math.sin(time*2.6)*3,color=kind==='finish'?'#477b79':kind==='checkpoint'?'#bb8c52':'#9d5758';
 ctx.save();ctx.translate(-54,0);
 // Buried anchor, rope, pole fittings and snow sit on the same ice plane.
 p(ctx,'M-21 9 -14-7 11-10 24 7 6 15Z','#88a1a3','#385965',2);
 p(ctx,'M-25 8 -12 2 5 4 20 1 28 9 5 17Z','#e5eee0','#7a9d9e',1.6);
 p(ctx,'M0-127 0 3',null,'#1e3c4b',6);
 p(ctx,'M-1-124 -1 0',null,'#a9bbb4',2);
 p(ctx,'M-3-112 3-112M-3-94 3-94M-3-15 3-15',null,'#c8b58c',3);
 p(ctx,'M3-113 24 4M0-99 -15 4',null,'#718d89',1.2);
 p(ctx,'M-5-129 -2-137 3-137 6-129 2-125Z','#d5c293','#294b56',1.8);
 // The cloth is a curved pennant with an embroidered expedition compass.
 p(ctx,`M3-119 C25 ${-129+sway} 43 ${-104-sway} 76-116 L66 ${-93+sway} 75-76 C48 ${-68-sway} 25-95 3-83Z`,color,'#233f4c',2.3);
 p(ctx,`M7-114 C27 ${-123+sway} 47 ${-101-sway} 69-110M7-88 C29-97 46 ${-73-sway} 67-80`,null,'#eadbb4',1.1);
 p(ctx,`M56-111 Q54-95 61-80L66 ${-93+sway} 76-116Z`,'#172e3d25',null);
 ctx.save();ctx.translate(34,-100+sway*.25);ctx.rotate(.09);
 p(ctx,'M0-13 3-4 12-2 4 2 1 12 -3 3 -12 1 -4-3Z','#e8d9b0','#384d50',1.1);
 p(ctx,'M-3-4 4 4M4-4 -3 4',null,'#274450',1.8);
 ctx.restore();
 p(ctx,'M8-118 8-84',null,'#6e6555',1.3);
 p(ctx,'M5-120 8-122M5-83 8-81',null,'#f2e7ce',2);
 ctx.restore();
 if(kind==='finish'){
  p(ctx,'M-6-9 23-65 66-40 83-9Z','#496d78','#294858',3);
  p(ctx,'M23-65 35-9H-6Z','#dbd4b1','#294858',2.5);
  p(ctx,'M20-35 29-9H9Z','#203d50','#294858',2);
  p(ctx,'M30-57 62-37 76-13M37-10 61-38',null,'#a6c5bf',1.6);
  p(ctx,'M-11-5 29-2 86-7',null,'#c4ded4',3);
 }
}
export function drawGem(ctx,x,y,time,{rare=false,reduced=false}={}){
 const bob=reduced?0:Math.sin(time*2.6)*3,shine=reduced?.55:(Math.sin(time*2)+1)/2;
 ctx.save();ctx.translate(x,y+bob);
 const glow=ctx.createRadialGradient(0,0,1,0,0,36);glow.addColorStop(0,rare?'#debbf04c':'#9ceddf5c');glow.addColorStop(1,'#b5f5e000');ctx.fillStyle=glow;ctx.fillRect(-37,-37,74,74);
 ctx.fillStyle='#244b6629';ctx.beginPath();ctx.ellipse(0,29,15,4,0,0,Math.PI*2);ctx.fill();
 p(ctx,'M-10-17 10-17 18-5 0 23 -18-5Z',rare?'#ad92d4':'#67bec7','#28536c',1.8);
 p(ctx,'M-10-17 0-8 -18-5Z',rare?'#e4cef2':'#c1efe1',null);
 p(ctx,'M-10-17 10-17 0-8Z',rare?'#f2e3ff':'#e0fae8',null);
 p(ctx,'M10-17 18-5 0-8Z',rare?'#b2a5e1':'#8ad9db',null);
 p(ctx,'M-18-5 0-8 0 23Z',rare?'#b79ce2':'#8ad9cc',null);
 p(ctx,'M0-8 18-5 0 23Z',rare?'#7a73b1':'#4a96bc',null);
 p(ctx,'M-18-5 18-5M0-8 0 23M-10-17 0-8 10-17',null,rare?'#8276ae':'#4a96ac',.8);
 p(ctx,'M-8-14 -13-7',null,'#f3fff0',2);
 ctx.globalAlpha=.4+shine*.6;
 p(ctx,'M-18-21 -18-14M-21.5-17.5 -14.5-17.5',null,'#e8fff0',1.4);
 if(shine>.55)p(ctx,'M20 1 20 7M17 4 23 4',null,'#f6f2d2',1.2);
 ctx.restore();
}
