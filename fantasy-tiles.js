/* Luli & Chris — Fantasy Tileset 02. Rendering only. */
(function(root){'use strict';
const SIZE=64, ATLAS=256;
const themes=['day','ruin','ruin','ruin','dusk','crystal','night','night'];
const profiles={day:{grass:[0,1,2,3],earth:[0,1,2],wall:[0,1],platform:0},ruin:{grass:[0,1,2],earth:[0,1,2],wall:[0,1],platform:1},dusk:{grass:[0,1,2,3],earth:[0,1,2],wall:[0,1],platform:1},crystal:{grass:[0,1,2],earth:[0,1,2],wall:[2,3],platform:2},night:{grass:[0,1,2],earth:[0,1,2],wall:[2,3],platform:3}};
const images={};
for(const name of Object.keys(profiles)){const im=new Image();im.src='assets/fantasy-tiles/'+name+'.png';images[name]=im;}
const ready=im=>!!(im&&im.complete&&im.naturalWidth===ATLAS&&im.naturalHeight===ATLAS);
function variant(list,x,y,seed){const n=(Math.imul(Math.floor(x),73856093)^Math.imul(Math.floor(y),19349663)^Math.imul(seed+1,83492791))>>>0;return list[n%list.length];}
function draw(ctx,phase,kind,x,y,w,h,view,cx,cy){
 const name=themes[phase],p=profiles[name],im=images[name];
 if(!p||!ready(im)||!['ground','platform','solid'].includes(kind))return false;
 if(![x,y,w,h,cx,cy,view?.w,view?.h].every(Number.isFinite)||w<=0||h<=0||view.w<=0||view.h<=0)return false;
 // Anchor ground/platform repetitions to the surface; wall tiles to the world grid.
 const tileW=kind==='solid'?32:64,tileH=kind==='platform'?h:tileW;
 const ox=kind==='solid'?Math.floor(x/tileW)*tileW:x,oy=kind==='solid'?Math.floor(y/tileH)*tileH:y;
 const right=x+w,bottom=y+h, leftVisible=Math.max(x,cx-1),topVisible=Math.max(y,cy-1),rightVisible=Math.min(right,cx+view.w+1),bottomVisible=Math.min(bottom,cy+view.h+1);
 if(rightVisible<=leftVisible||bottomVisible<=topVisible)return true;
 const firstCol=Math.max(0,Math.floor((leftVisible-ox)/tileW)),lastCol=Math.ceil((rightVisible-ox)/tileW);
 const firstRow=Math.max(0,Math.floor((topVisible-oy)/tileH)),lastRow=Math.ceil((bottomVisible-oy)/tileH);
 ctx.save();try{ctx.imageSmoothingEnabled=false;
 for(let row=firstRow;row<lastRow;row++)for(let col=firstCol;col<lastCol;col++){
  const tx=ox+col*tileW,ty=oy+row*tileH,dx=Math.max(x,tx),dy=Math.max(y,ty),dw=Math.min(right,tx+tileW)-dx,dh=Math.min(bottom,ty+tileH)-dy;
  if(dw<=0||dh<=0)continue;
  let r,c,sourceH=SIZE;
  if(kind==='platform'){r=3;c=p.platform;sourceH=24;}
  else if(kind==='solid'){r=2;c=variant(p.wall,tx/tileW,ty/tileH,phase);}
  else if(row===0){r=0;c=variant(p.grass,tx/tileW,ty/tileH,phase);}
  else{r=1;c=variant(p.earth,tx/tileW,ty/tileH,phase);}
  // Crop partial end tiles rather than stretch; each destination stays inside the existing rectangle.
  const sx=c*SIZE+(dx-tx)*SIZE/tileW,sy=r*SIZE+(dy-ty)*sourceH/tileH,sw=dw*SIZE/tileW,sh=dh*sourceH/tileH;
  ctx.drawImage(im,sx,sy,sw,sh,dx,dy,dw,dh);
 }
 }finally{ctx.restore();}return true;
}
root.LuliFantasyTiles=Object.freeze({draw});
})(globalThis);
