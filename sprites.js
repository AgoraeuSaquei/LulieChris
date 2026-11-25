/* Leitor oficial de spritesheets — Luli Studio V5.
   Formato do arquivo: 384x320, 6 colunas x 5 linhas, células 64x64.
   Não recorta nem recria PNGs: desenha o quadro diretamente da imagem original. */
(function(){'use strict';
 const W=384,H=320,S=64,COLS=6,ROWS=5;
 const HERO={idle:{row:0,frames:4,fps:3},run:{row:1,frames:6,fps:10},jump:{row:2,frames:4,fps:7},landing:{row:3,frames:2,fps:10},talk:{row:4,frames:4,fps:4}};
 const NPC={idle:{row:0,frames:4,fps:3},move:{row:1,frames:4,fps:8},talk:{row:2,frames:3,fps:8},special:{row:3,frames:2,fps:8},extra:{row:4,frames:1,fps:8}};
 const ENEMY={idle:{row:0,frames:4,fps:3},move:{row:1,frames:4,fps:8},attack:{row:2,frames:3,fps:8},hurt:{row:3,frames:2,fps:8},death:{row:4,frames:3,fps:7}};
 function ready(image){return !!(image&&image.complete&&image.naturalWidth===W&&image.naturalHeight===H)}
 function paint(ctx,image,row,frame,x,y,w,h,flip=false){
   if(!ready(image))return false;
   ctx.save();if(flip){ctx.translate(x+w/2,0);ctx.scale(-1,1);x=-w/2;}
   ctx.drawImage(image,(Math.max(0,frame|0)%COLS)*S,(Math.max(0,row|0)%ROWS)*S,S,S,x,y,w,h);ctx.restore();return true;
 }
 function frameFor(state,t,spec){const v=spec[state]||spec.idle;return Math.floor(t*v.fps)%v.frames;}
 window.LuliSheets=Object.freeze({W,H,S,COLS,ROWS,HERO,NPC,ENEMY,ready,paint,frameFor});
})();
