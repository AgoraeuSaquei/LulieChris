/* Node 18+: node tests/test_fantasy_assets.cjs
 * Exercise the exact shipped visual modules with simulated decoded images and Canvas.
 */
function runFantasyTests(art,tiles,campaign){
 const root={},created=[];class ImageMock{constructor(){this.complete=true;created.push(this);}set src(v){this.url=v;this.naturalWidth=v.includes('fantasy-tiles')?256:v.endsWith('.webp')?1440:360;this.naturalHeight=v.includes('fantasy-tiles')?256:v.endsWith('.webp')?810:400;}}
 new Function('globalThis','Image',art)(root,ImageMock);new Function('globalThis','Image',tiles)(root,ImageMock);
 const A=root.LuliFantasyArt,T=root.LuliFantasyTiles,assert=(v,m)=>{if(!v)throw Error(m)},draws=[];let depth=0;
 const ctx={save(){depth++},restore(){depth--},fillRect(){},drawImage(im,...args){assert(args.every(Number.isFinite),'non-finite rectangle');draws.push({url:im.url,args});}};
 const counts={background:0,decor:0,tiles:0};assert(created.length===17,'expected 17 images');
 for(let i=0;i<8;i++){const l=campaign.levels[i];
  for(const width of [320,960,1700])for(const cx of [0,Math.max(0,l.width-width)/2,Math.max(0,l.width-width)])for(const cy of [0,Math.max(0,l.height-540)]){
   const view={w:width,h:540};draws.length=0;assert(A.background(ctx,i,l,view,cx,cy),'background missing');const bg=draws[0].args;assert(bg[0]<=0&&bg[1]<=0&&bg[0]+bg[2]>=width&&bg[1]+bg[3]>=540,'background does not cover viewport');counts.background++;
   draws.length=0;assert(A.decor(ctx,i,l,view,cx,cy),'decor missing');counts.decor++;
   for(const o of l.entities.filter(x=>['ground','platform','solid'].includes(x.kind))){const y=o.kind==='ground'?l.height-78:o.y,h=o.kind==='ground'?198:o.kind==='platform'?18:o.height;draws.length=0;assert(T.draw(ctx,i,o.kind,o.x,y,o.width,h,view,cx,cy),'tile renderer not available');counts.tiles++;
    for(const d of draws){const [sx,sy,sw,sh,x,yy,w,hh]=d.args;assert(sx>=0&&sy>=0&&sw>0&&sh>0&&sx+sw<=256.001&&sy+sh<=256.001,'outside atlas');assert(x>=o.x-.001&&yy>=y-.001&&x+w<=o.x+o.width+.001&&yy+hh<=y+h+.001,'outside terrain');}
   }assert(depth===0,'unbalanced Canvas state');
  }
 }
 for(const im of created)im.complete=false;
 assert(!A.background(ctx,0,campaign.levels[0],{w:960,h:540},0,0)&&!A.decor(ctx,0,campaign.levels[0],{w:960,h:540},0,0)&&!T.draw(ctx,0,'ground',0,462,720,198,{w:960,h:540},0,0),'fallback not activated');
 return counts;
}
if(typeof module!=='undefined'&&require.main===module){const fs=require('node:fs'),path=require('node:path'),read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),s=read('levels.js');console.log(runFantasyTests(read('fantasy-art.js'),read('fantasy-tiles.js'),JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))));}
