/* Shared puzzle geometry and axis-separated collision. Coordinates are top-left. */
(function(root){'use strict';
 const kinds=['solid','crate','plate','door'];
 const defaults={solid:[32,32],crate:[64,64],plate:[64,12],door:[32,192]};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const num=(v,d)=>Number.isFinite(+v)?+v:d;
 function normalize(o,w,h){const [dw,dh]=defaults[o.kind];const ww=clamp(num(o.width,dw),o.kind==='plate'?32:16,w),hh=clamp(num(o.height,dh),8,h);return {...o,x:clamp(num(o.x,0),0,w-ww),y:clamp(num(o.y,0),0,h-hh),width:ww,height:hh,channel:String(o.channel||'A').trim().slice(0,40)||'A'};}
 const overlap=(a,b)=>a.x<b.x+b.w-.01&&a.x+a.w>b.x+.01&&a.y<b.y+b.h-.01&&a.y+a.h>b.y+.01;
 const horizontal=(a,b)=>a.x<b.x+b.w-.01&&a.x+a.w>b.x+.01;
 const vertical=(a,b)=>a.y<b.y+b.h-.01&&a.y+a.h>b.y+.01;
 function sweep(body,delta,axis,obstacles){let travel=delta,hit=null;if(!delta)return {travel,hit};const dim=axis==='x'?'w':'h',cross=axis==='x'?vertical:horizontal;for(const o of obstacles){if(o===body||!cross(body,o))continue;const start=body[axis],end=start+body[dim];let dist;if(delta>0&&end<=o[axis]+.05){dist=Math.max(0,o[axis]-end);if(dist<travel){travel=dist;hit=o;}}else if(delta<0&&start>=o[axis]+o[dim]-.05){dist=Math.min(0,o[axis]+o[dim]-start);if(dist>travel){travel=dist;hit=o;}}}body[axis]+=travel;return {travel,hit};}
 function moveY(body,dy,solids,surfaces){const bottom=body.y+body.h;const allowed=dy>=0?[...solids,...surfaces.filter(s=>bottom<=s.y+.1)]:solids;const r=sweep(body,dy,'y',allowed);body.onGround=dy>=0&&!!r.hit;if(r.hit)body.vy=0;return r;}
 function signal(plates,doors,bodies){for(const p of plates)p.pressed=bodies.some(b=>horizontal(b,p)&&b.y+b.h>=p.y-5&&b.y+b.h<=p.y+p.h+5&&b.onGround);for(const d of doors){const linked=plates.filter(p=>p.channel===d.channel);d.open=(linked.length>0&&linked.every(p=>p.pressed))||(d.open&&bodies.some(b=>overlap(b,d)));}}
 function paint(ctx,o,editor=false){const w=o.w??o.width,h=o.h??o.height,x=o.x,y=o.y;ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#41334d';if(o.kind==='solid'){ctx.fillStyle='#88768c';ctx.fillRect(x,y,w,h);ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.fillStyle='#c5a9bb';ctx.fillRect(x+3,y+3,w-6,4);}else if(o.kind==='crate'){ctx.fillStyle='#ad8154';ctx.fillRect(x,y,w,h);ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.strokeStyle='#75513c';ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+w-5,y+h-5);ctx.moveTo(x+w-5,y+5);ctx.lineTo(x+5,y+h-5);ctx.stroke();}else if(o.kind==='plate'){ctx.fillStyle=o.pressed?'#83e4a5':'#f4c46a';ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}else if(o.kind==='door'){ctx.fillStyle=o.open?'#83e4a533':'#577b91';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#c9e2ea';ctx.strokeRect(x+1,y+1,w-2,h-2);}if(o.kind==='plate'||o.kind==='door'){ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(o.channel,x+w/2,y-5);}ctx.restore();}
 root.LuliPuzzles={kinds,defaults,normalize,overlap,sweep,moveY,signal,paint};
})(globalThis);
