import {sampleDaniPose} from './dani-rig.mjs';
const INK='#111516',COAT='#1c1e1f',SKIN='#fac4a3';
function path(ctx,d,fill,stroke=INK,width=4){ctx.beginPath();for(const [op,...args] of d)ctx[op](...args);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}}
function vector(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};}
function tube(ctx,{root:a,joint:b,end:c},r0,r1,r2,fill){
 const u=vector(a,b),v=vector(b,c),n={x:-(u.y+v.y),y:u.x+v.x},len=Math.hypot(n.x,n.y)||1;n.x/=len;n.y/=len;
 const A={x:-u.y*r0,y:u.x*r0},B={x:n.x*r1,y:n.y*r1},C={x:-v.y*r2,y:v.x*r2};
 path(ctx,[['moveTo',a.x+A.x,a.y+A.y],['quadraticCurveTo',b.x+B.x,b.y+B.y,b.x+B.x,b.y+B.y],['quadraticCurveTo',(b.x+c.x)/2+B.x,(b.y+c.y)/2+B.y,c.x+C.x,c.y+C.y],['lineTo',c.x-C.x,c.y-C.y],['quadraticCurveTo',(b.x+c.x)/2-B.x,(b.y+c.y)/2-B.y,b.x-B.x,b.y-B.y],['quadraticCurveTo',(a.x+b.x)/2-A.x,(a.y+b.y)/2-A.y,a.x-A.x,a.y-A.y],['closePath']],fill);
}
function boot(ctx,ankle,near){
 ctx.save();ctx.translate(ankle.x,ankle.y);
 path(ctx,[['moveTo',-25,-93],['lineTo',25,-94],['lineTo',22,-23],['quadraticCurveTo',30,6,32,34],['lineTo',-85,34],['lineTo',-85,19],['quadraticCurveTo',-84,3,-66,-1],['lineTo',-25,-24],['closePath']],near?'#29292f':'#22232a');
 path(ctx,[['moveTo',-84,23],['quadraticCurveTo',-37,25,30,20],['lineTo',32,34],['lineTo',-85,34],['closePath']],'#17181e');
 path(ctx,[['moveTo',-20,-87],['lineTo',17,-88],['lineTo',13,-20],['lineTo',-26,-4]],null,'#101216',2.5);
 for(let i=0;i<5;i++){const yy=-75+i*13;path(ctx,[['moveTo',-19,yy],['lineTo',15,yy+10],['moveTo',15,yy],['lineTo',-19,yy+10]],null,'#101216',2.5);}
 path(ctx,[['moveTo',-65,0],['quadraticCurveTo',-40,3,-35,23]],null,'#101216',2.7);
 ctx.restore();
}
function leg(ctx,limb,near){tube(ctx,limb,near?37:32,near?24:22,19,near?'#2d3e46':'#27373e');boot(ctx,limb.end,near);}
function hand(ctx,limb){
 ctx.save();ctx.translate(limb.end.x,limb.end.y);ctx.rotate(-limb.angle);
 path(ctx,[['moveTo',-14,-4],['lineTo',13,-4],['lineTo',19,17],['quadraticCurveTo',19,27,13,43],['lineTo',4,60],['lineTo',-3,49],['lineTo',-8,62],['lineTo',-15,49],['lineTo',-19,54],['quadraticCurveTo',-24,32,-17,15],['lineTo',-23,27],['lineTo',-29,22],['quadraticCurveTo',-23,4,-14,-4],['closePath']],SKIN,INK,3.6);
 path(ctx,[['moveTo',-9,24],['lineTo',-15,49],['moveTo',0,27],['lineTo',-3,49],['moveTo',8,29],['lineTo',4,47]],null,'#5c4135',2.2);
 ctx.restore();
}
function sleeve(ctx,limb,near){
 hand(ctx,limb);tube(ctx,limb,near?29:25,22,16,near?COAT:'#171b1d');
 const v=vector(limb.joint,limb.end),nx=-v.y,ny=v.x;
 path(ctx,[['moveTo',limb.end.x+nx*16,limb.end.y+ny*16],['lineTo',limb.end.x+v.x*8+nx*15,limb.end.y+v.y*8+ny*15],['lineTo',limb.end.x+v.x*8-nx*15,limb.end.y+v.y*8-ny*15],['lineTo',limb.end.x-nx*16,limb.end.y-ny*16],['closePath']],'#e0e4d9',INK,3);
}
function torso(ctx){
 // Draw a complete jacket, including the area hidden by the reference's hand.
 path(ctx,[['moveTo',220,310],['lineTo',291,304],['lineTo',321,330],['lineTo',303,443],['lineTo',327,516],['lineTo',335,552],['lineTo',180,552],['lineTo',198,493],['lineTo',217,413],['lineTo',196,342],['closePath']],'#dfe3d5');
 path(ctx,[['moveTo',193,514],['lineTo',313,514],['lineTo',333,550],['lineTo',327,577],['quadraticCurveTo',302,592,286,586],['lineTo',259,570],['lineTo',236,588],['quadraticCurveTo',208,593,184,576],['lineTo',183,550],['closePath']],'#2d3e46',null);
 path(ctx,[['moveTo',236,332],['quadraticCurveTo',237,425,230,504],['moveTo',251,334],['lineTo',247,506],['moveTo',265,330],['lineTo',261,507],['moveTo',279,326],['lineTo',275,504]],null,'#b8bfb4',2);
 path(ctx,[['moveTo',199,320],['lineTo',235,309],['lineTo',243,351],['lineTo',236,494],['lineTo',193,490],['lineTo',212,431],['lineTo',214,383],['lineTo',187,337],['closePath']],COAT);
 path(ctx,[['moveTo',287,310],['lineTo',321,323],['lineTo',347,344],['lineTo',320,379],['lineTo',303,446],['lineTo',327,493],['lineTo',265,495],['lineTo',267,388],['closePath']],COAT);
 path(ctx,[['moveTo',197,323],['lineTo',241,351],['lineTo',224,369],['lineTo',235,383],['moveTo',321,324],['lineTo',275,359],['lineTo',284,376],['lineTo',268,393]],null,'#0c1112',4);
 path(ctx,[['moveTo',235,301],['lineTo',305,281],['quadraticCurveTo',306,310,296,326],['quadraticCurveTo',265,342,243,328],['closePath']],'#e4e7dc');
 path(ctx,[['moveTo',244,303],['lineTo',251,330],['moveTo',259,299],['lineTo',265,333],['moveTo',278,292],['lineTo',282,331],['moveTo',296,286],['lineTo',295,324]],null,'#b5bdb1',2);
 path(ctx,[['moveTo',194,516],['lineTo',325,516],['moveTo',240,519],['lineTo',238,567],['lineTo',254,573],['moveTo',202,520],['quadraticCurveTo',202,544,182,545],['moveTo',286,520],['quadraticCurveTo',292,548,329,543]],null,INK,3);
}
function head(ctx,image,mouth=0){
 ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(512,0);ctx.lineTo(512,311);ctx.lineTo(308,311);ctx.lineTo(306,279);ctx.lineTo(291,283);ctx.lineTo(269,293);ctx.lineTo(234,302);ctx.lineTo(234,313);ctx.lineTo(0,313);ctx.closePath();ctx.clip();ctx.drawImage(image,0,0);ctx.restore();
 if(mouth>.12){
  path(ctx,[['moveTo',216,227],['quadraticCurveTo',238,212,267,229],['quadraticCurveTo',243,251,216,238],['closePath']],'#fac4a3',null);
  const open=3+mouth*8;
  path(ctx,[['moveTo',222,231],['quadraticCurveTo',239,223,260,232],['quadraticCurveTo',241,232+open*2,222,231],['closePath']],'#39262a','#171516',2.6);
  path(ctx,[['moveTo',229,231],['quadraticCurveTo',242,228,252,232]],null,'#f5e8d7',2);
 }
}
export function drawDani(ctx,image,options){
 if(!(image.naturalWidth||image.width))return;
 const {x=0,y=0,facing=1,height=206}=options,pose=sampleDaniPose(options),s=height/980;
 ctx.save();ctx.translate(x,y);ctx.scale(-facing*s,s);ctx.translate(-260,-1000);
 leg(ctx,pose.farLeg,false);sleeve(ctx,pose.farArm,false);leg(ctx,pose.nearLeg,true);
 ctx.save();ctx.translate(pose.bodyX,pose.bodyY);ctx.translate(260,550);ctx.rotate(pose.tilt);ctx.translate(-260,-550);torso(ctx);head(ctx,image,options.mouthOpen||0);ctx.restore();
 sleeve(ctx,pose.nearArm,true);ctx.restore();
}
