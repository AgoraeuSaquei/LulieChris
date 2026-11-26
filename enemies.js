/* Enemy movement: shares the existing puzzle collision geometry.
 * Editor coordinates: x = left; y = feet (ground enemies) or flight anchor.
 * No changes to map schema, damage rules, or puzzle activation.
 */
(function(root){'use strict';
  const P=root.LuliPuzzles;
  const BASE_SPEED={plum:46,lemon:88,pepper:43,pumpkin:42,bat:66,vine:0};
  const GRAVITY=1780, EPS=.05, STEP_DOWN=16, JUMP_HEIGHT=54;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const modes=new Set(['patrol','chase','jump','fly','stationary']);
  function modeOf(e){
    if(modes.has(e.ai?.mode))return e.ai.mode;
    return e.type==='bat'?'fly':e.type==='pepper'?'jump':e.type==='vine'?'stationary':'patrol';
  }
  function limits(e,world){
    const maxX=Math.max(0,world.width-e.w),home=clamp(finite(e.home,e.x),0,maxX);
    const range=Math.max(0,finite(e.ai?.range,finite(e.range,90)));
    return [Math.max(0,home-range),Math.min(maxX,home+range)];
  }
  function interval(e){return Math.max(.15,finite(e.ai?.jumpInterval,1.5));}
  function flightY(e,world){
    const anchor=finite(e.homeY,world.floor-133);
    if(!e.ai&&!Number.isFinite(e.homeY))return world.floor-144+Math.sin(e.phase*3.8)*34;
    return anchor-e.h*.5+Math.sin(e.phase*4)*22;
  }
  function blocksFor(e,world){return modeOf(e)==='fly'?[...world.solids,...world.surfaces]:world.solids;}
  function isFree(e,x,y,world,blocks){
    if(x<-EPS||x+e.w>world.width+EPS||y<-EPS||y+e.h>world.height+EPS)return false;
    const box={x,y,w:e.w,h:e.h};
    return !blocks.some(o=>P.overlap(box,o));
  }
  // The sweep routine expects an initially non-overlapping body. A closing
  // door or an editor spawn can violate that assumption: repair locally first.
  function repair(e,world,blocks){
    const maxX=Math.max(0,world.width-e.w),maxY=Math.max(0,world.height-e.h);
    const x=clamp(e.x,0,maxX),y=clamp(e.y,0,maxY);
    if(isFree(e,x,y,world,blocks)){e.x=x;e.y=y;return true;}
    const [lo,hi]=limits(e,world);
    const near=blocks.filter(o=>o.x<x+e.w+96&&o.x+o.w>x-96&&o.y<y+e.h+96&&o.y+o.h>y-96);
    const xs=new Set([x]),ys=new Set([y]);
    for(const o of near){
      xs.add(clamp(o.x-e.w,lo,hi));xs.add(clamp(o.x+o.w,lo,hi));
      ys.add(clamp(o.y-e.h,0,maxY));ys.add(clamp(o.y+o.h,0,maxY));
    }
    let best=null,bestCost=Infinity;
    for(const nx of xs)for(const ny of ys){
      if(Math.abs(nx-x)>96||Math.abs(ny-y)>96)continue;
      const cost=Math.abs(nx-x)+Math.abs(ny-y)+(ny>y?.01:0);
      if(cost>=bestCost||!isFree(e,nx,ny,world,blocks))continue;
      best={x:nx,y:ny};bestCost=cost;
    }
    if(!best)return false;
    e.x=best.x;e.y=best.y;e.vy=0;e.onGround=false;e.supportY=null;
    return true;
  }
  function resetPosition(e,world){
    e.x=clamp(finite(e.home,e.x),0,Math.max(0,world.width-e.w));
    e.y=modeOf(e)==='fly'?flightY(e,world):finite(e.homeY,world.floor)-e.h;
    e.y=clamp(e.y,0,Math.max(0,world.height-e.h));
    e.vy=0;e.onGround=false;e.supportY=null;
    e.jumpTimer=Math.max(.12,interval(e)-(Math.max(0,e.phase||0)%interval(e)));
    e.blocked=!repair(e,world,blocksFor(e,world));
    if(!e.blocked&&modeOf(e)!=='fly'){
      P.moveY(e,.2,world.solids,world.surfaces);
      if(e.onGround)e.supportY=e.y+e.h;
    }
    return !e.blocked;
  }
  function initialize(e,world){
    if(!Number.isInteger(e.maxHp)||e.maxHp<1)e.maxHp=Number.isInteger(e.hp)&&e.hp>0?e.hp:1;
    if(!Number.isFinite(e.hp))e.hp=e.maxHp;
    e.dir=e.dir<0?-1:1;
    return resetPosition(e,world);
  }
  function healthRatio(e){
    const max=Number.isFinite(e.maxHp)&&e.maxHp>0?e.maxHp:1;
    return clamp(finite(e.hp,0)/max,0,1);
  }
  function supportAhead(e,dx,world,feet){
    const front=dx>0?e.x+e.w+dx-1:e.x+dx+1;
    return [...world.surfaces,...world.solids].some(o=>
      front>=o.x-EPS&&front<=o.x+o.w+EPS&&o.y>=feet-EPS&&o.y<=feet+STEP_DOWN);
  }
  function horizontal(e,dt,world,player,mode,blocks){
    if(mode==='stationary'||e.stun>0)return;
    const speed=Math.max(0,finite(e.ai?.speed,BASE_SPEED[e.type]||0));
    if(!speed)return;
    const [lo,hi]=limits(e,world);
    const distance=player?player.x+(player.w||0)/2-(e.x+e.w/2):Infinity;
    const chasing=mode==='chase'&&Math.abs(distance)<Math.max(0,finite(e.ai?.aggro,195));
    if(chasing&&Math.abs(distance)>EPS)e.dir=Math.sign(distance);
    const rate=mode==='chase'&&!chasing?.4:1;
    let dx=e.dir*speed*dt*rate;
    if(chasing)dx=Math.sign(distance)*Math.min(Math.abs(dx),Math.abs(distance));
    // A chase is also bounded by the editor's patrol range; no teleporting.
    if(e.x<lo)dx=Math.min(speed*dt,lo-e.x);
    else if(e.x>hi)dx=-Math.min(speed*dt,e.x-hi);
    else dx=clamp(e.x+dx,lo,hi)-e.x;
    if(Math.abs(dx)<1e-8){if(!chasing)e.dir*=-1;return;}
    const feet=e.onGround?e.y+e.h:mode==='jump'?e.supportY:null;
    if(mode!=='fly'&&Number.isFinite(feet)&&!supportAhead(e,dx,world,feet)){
      if(!chasing)e.dir*=-1;return;
    }
    const r=P.sweep(e,dx,'x',blocks);
    if((r.hit||Math.abs(r.travel-dx)>EPS||e.x<=lo+EPS||e.x>=hi-EPS)&&!chasing)e.dir*=-1;
  }
  function step(e,dt,world,player){
    if(!e.alive)return false;
    const mode=modeOf(e),blocks=blocksFor(e,world);
    if(e.y>world.height+80&&!resetPosition(e,world))return false;
    if(e.blocked||e.x<0||e.x+e.w>world.width||e.y<0||blocks.some(o=>P.overlap(e,o))){
      e.blocked=!repair(e,world,blocks);
      if(e.blocked)return false;
    }
    horizontal(e,dt,world,player,mode,blocks);
    if(mode==='fly'){
      const target=clamp(flightY(e,world),0,Math.max(0,world.height-e.h));
      P.sweep(e,target-e.y,'y',blocks);e.onGround=false;return true;
    }
    e.jumpTimer=Math.max(0,finite(e.jumpTimer,interval(e))-dt);
    if(mode==='jump'&&e.onGround&&e.stun<=0&&e.jumpTimer<=0){
      e.vy=-Math.sqrt(2*GRAVITY*JUMP_HEIGHT);e.onGround=false;e.jumpTimer=interval(e);
    }
    e.vy=clamp(finite(e.vy,0)+GRAVITY*dt,-900,1200);
    P.moveY(e,e.vy*dt,world.solids,world.surfaces);
    if(e.y<0){e.y=0;e.vy=Math.max(0,e.vy);}
    if(e.onGround)e.supportY=e.y+e.h;
    if(e.y>world.height+80)return resetPosition(e,world);
    return true;
  }
  root.LuliEnemies=Object.freeze({initialize,step,healthRatio,modeOf});
})(globalThis);
