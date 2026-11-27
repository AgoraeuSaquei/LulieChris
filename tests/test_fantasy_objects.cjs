/* node tests/test_fantasy_objects.cjs */
function runObjectsTests(source,campaign){
 const root={},images=[];class MockImage{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;images.push(this);}}
 new Function('globalThis','Image',source)(root,MockImage);
 const A=root.LuliFantasyObjects,assert=(x,m)=>{if(!x)throw Error(m)};let depth=0,draws=[],transforms=[],fills=[];
 const ctx={save(){depth++},restore(){depth--},translate(x,y){transforms.push(['translate',x,y])},rotate(a){transforms.push(['rotate',a])},drawImage(im,...args){assert(args.every(Number.isFinite),'invalid draw');draws.push({src:im.src,args});},fillRect(...args){fills.push(args)}};
 let count=0;
 for(const level of campaign.levels)for(const o of level.entities){
 if(o.kind==='checkpoint'){for(const active of [false,true]){draws=[];assert(A.checkpoint(ctx,o.x,o.y,active),'checkpoint missing');assert(draws.length===1&&draws[0].src.endsWith(active?'checkpoint-active.svg':'checkpoint-idle.svg'),'flag state');assert(draws[0].args[1]+draws[0].args[3]===o.y,'flag anchor');count++;}}
 if(!['crate','door','plate'].includes(o.kind))continue;
 const obj={...o,w:o.width,h:o.height};
 for(const state of [false,true]){draws=[];fills=[];transforms=[];assert(A.draw(ctx,{...obj,pressed:state,open:state}),'object missing');
 if(o.kind==='door'){if(state){assert(draws.length===0&&fills.length===2,'open gate blocked');}else{const vert=obj.h>=obj.w,L=vert?obj.h:obj.w,W=vert?obj.w:obj.h;let end=0;for(const {args:a} of draws){assert(a[0]===0&&a[1]===0&&a[2]===32&&a[3]<=48.00001&&a[4]===0&&a[5]===end&&a[6]===W&&a[7]>0,'segment alignment');end+=a[7];}assert(Math.abs(end-L)<.00001,'gate coverage');assert(transforms.some(t=>t[0]==='rotate')===!vert,'orientation');}}
 else{assert(draws.length===1,'object draw count');assert(draws[0].args.join(',')===[obj.x,obj.y,obj.w,obj.h].join(','),'bounds');if(o.kind==='plate')assert(draws[0].src.endsWith(state?'plate-active.svg':'plate-idle.svg'),'plate state');}
 assert(depth===0,'canvas state leak');count++;}
 }
 for(const im of images)im.complete=false;
 assert(!A.draw(ctx,{kind:'crate',x:0,y:0,w:64,h:64})&&!A.checkpoint(ctx,0,0,true),'fallback');
 return {count,assets:images.length};
}
if(typeof module!=='undefined'&&require.main===module){const fs=require('node:fs'),path=require('node:path'),read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'),s=read('levels.js');console.log(runObjectsTests(read('fantasy-objects.js'),JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))));}
