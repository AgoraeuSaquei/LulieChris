/* Fantasy Art Pack 02 — purely visual, no gameplay or save state changes. */
(function(root){'use strict';
const urls={day:'forest-day.webp',tower:'abandoned-tower.webp',gateway:'elven-gateway.webp',royal:'royal-ruins.webp',dusk:'twilight-forest.webp',sanctuary:'crystal-sanctuary.webp',abyss:'moonlit-abyss.webp',night:'castle-night.webp',tree:'magic-tree.png',ruin:'elven-ruin.png',crystals:'crystals.png',lantern:'flower-lantern.png'};
const images={};
for(const [key,file] of Object.entries(urls)){const im=new Image();im.src='assets/fantasy/'+file;images[key]=im;}
const ready=key=>{const im=images[key];return !!(im&&im.complete&&im.naturalWidth>0&&im.naturalHeight>0);};
const themes=['day','tower','gateway','royal','dusk','sanctuary','abyss','night'];
const veil=['rgba(48,78,101,.12)','rgba(46,48,84,.16)','rgba(28,64,65,.14)','rgba(62,45,83,.17)','rgba(55,25,70,.17)','rgba(18,45,77,.18)','rgba(22,29,65,.19)','rgba(24,19,52,.22)'];
const pilot=i=>Number.isInteger(i)&&i>=0&&i<themes.length;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function background(ctx,i,level,view,cx,cy){
 if(!pilot(i))return false;const key=themes[i];if(!ready(key))return false;
 const im=images[key],scale=Math.max(view.w*1.14/im.naturalWidth,view.h*1.12/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
 const tx=clamp(cx/Math.max(1,level.width-view.w),0,1),ty=clamp(cy/Math.max(1,level.height-view.h),0,1);
 // Overscan and restrained panning: never expose blank edges or repeat a seam.
 const x=-(w-view.w)*(.34+tx*.32),y=-(h-view.h)*(.25+ty*.50);
 ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=.92;ctx.drawImage(im,x,y,w,h);ctx.globalAlpha=1;
 // Recess the detailed illustration behind terrain and actors for readability.
 ctx.fillStyle=veil[i];ctx.fillRect(0,0,view.w,view.h);ctx.restore();return true;
}
// Authored placements reference existing surfaces; decorations are never physics objects.
const placements={0:[['tree',134,462,300,.63],['ruin',622,462,205,.46],['lantern',680,462,84,.62],['crystals',938,462,65,.48 ]],
1:[['ruin',195,462,244,.43],['lantern',305,462,76,.56],['tree',755,352,238,.43],['ruin',1124,365,210,.38],['crystals',1515,352,54,.45],['tree',1840,462,285,.44],['ruin',2225,462,244,.43],['lantern',2410,352,67,.57]],
2:[['tree',135,462,275,.42],['crystals',235,462,52,.43],['ruin',446,462,205,.39],['lantern',740,462,73,.55],['tree',894,462,235,.39]],
3:[['ruin',185,462,240,.44],['tree',640,462,265,.40],['lantern',692,462,76,.54],['crystals',1035,462,52,.44],['ruin',1480,462,260,.42],['tree',1760,462,252,.37]],
4:[['tree',185,448,287,.43],['ruin',430,448,224,.39],['lantern',580,448,81,.59],['crystals',1000,462,55,.45],['ruin',1248,352,190,.39],['tree',1710,256,260,.38],['lantern',1872,256,67,.55]],
5:[['tree',190,462,268,.38],['ruin',515,462,196,.35],['lantern',810,462,70,.54],['crystals',1060,462,52,.46],['ruin',1490,462,240,.40],['tree',2010,462,280,.40],['lantern',1775,192,61,.52]],
6:[['lantern',180,722,83,.59],['ruin',355,722,218,.40],['tree',309,416,260,.37],['crystals',535,224,54,.43],['ruin',1100,512,240,.38],['lantern',1025,512,76,.57]],
7:[['ruin',184,128,220,.50],['lantern',715,192,80,.55],['tree',865,928,330,.44],['ruin',520,928,235,.44],['crystals',790,928,72,.46],['lantern',305,928,77,.58]]};
function decor(ctx,i,level,view,cx,cy){
 if(!pilot(i))return false;const list=placements[i];if(!list.every(([key])=>ready(key)))return false;
 ctx.save();ctx.imageSmoothingEnabled=true;
 for(const [key,x,bottom,height,alpha] of list){const im=images[key],w=height*im.naturalWidth/im.naturalHeight,y=bottom-height,left=x-w/2;
  if(left+w<cx-32||left>cx+view.w+32||bottom<cy-32||y>cy+view.h+32)continue;
  ctx.globalAlpha=alpha;ctx.drawImage(im,left,y,w,height);
 }
 ctx.restore();return true;
}
root.LuliFantasyArt=Object.freeze({background,decor,pilot});
})(globalThis);
