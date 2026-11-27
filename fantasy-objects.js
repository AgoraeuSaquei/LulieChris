(function(root){'use strict';
const images={};for(const key of ['crate','gate','plate-idle','plate-active','checkpoint-idle','checkpoint-active']){const im=new Image();im.src='assets/fantasy-interactive/'+key+'.svg';images[key]=im;}
const ready=k=>{const im=images[k];return !!(im&&im.complete&&im.naturalWidth>0&&im.naturalHeight>0);};
function draw(ctx,o){
 const {x,y,w,h}=o;if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return false;
 const key=o.kind==='plate'?'plate-'+(o.pressed?'active':'idle'):o.kind==='crate'?'crate':o.kind==='door'?'gate':null;
 if(!key||!ready(key))return false;
 ctx.save();ctx.imageSmoothingEnabled=false;
 try{
 if(o.kind==='door'){
  if(o.open){ctx.globalAlpha=.66;ctx.fillStyle='#8ce4b5';if(h>=w){ctx.fillRect(x,y,2,h);ctx.fillRect(x+w-2,y,2,h);}else{ctx.fillRect(x,y,w,2);ctx.fillRect(x,y+h-2,w,2);}return true;}
  // Repeat a 32x48 segment along the long axis, including partial end segments.
  const vertical=h>=w,thickness=vertical?w:h,length=vertical?h:w,step=48*thickness/32;
  if(!vertical){ctx.translate(x+w,y);ctx.rotate(Math.PI/2);}else ctx.translate(x,y);
  for(let pos=0;pos<length;pos+=step){const size=Math.min(step,length-pos);ctx.drawImage(images.gate,0,0,32,48*size/step,0,pos,thickness,size);}
 }else ctx.drawImage(images[key],x,y,w,h);
 return true;
 }finally{ctx.restore();}
}
function checkpoint(ctx,x,y,active){const key='checkpoint-'+(active?'active':'idle');if(!ready(key))return false;ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(images[key],x-10,y-120,72,120);return true;}finally{ctx.restore();}}
root.LuliFantasyObjects=Object.freeze({draw,checkpoint});
})(globalThis);
