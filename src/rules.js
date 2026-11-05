// Pure gameplay rules; importable in Node without PlayCanvas for automated testing.
export const SHIP_CLASSES={
 interceptor:{name:'SPECTRE',role:'Interceptor',tag:'LIGHT / AGILE',hp:105,shields:85,acceleration:10,turn:1.72,maxSpeed:29,laserDamage:10,laserDelay:.16,missileDamage:46,missileDelay:3.1,missileAmmo:10,flares:4,radius:.58,color:'#63e1ff',lockTime:1.25},
 fighter:{name:'VANGUARD',role:'Assault',tag:'BALANCED / PRECISE',hp:155,shields:120,acceleration:7.8,turn:1.34,maxSpeed:25,laserDamage:15,laserDelay:.23,missileDamage:62,missileDelay:3.6,missileAmmo:9,flares:3,radius:.74,color:'#ffc38a',lockTime:1.55},
 dreadnought:{name:'TITAN',role:'Dreadnought',tag:'ARMORED / HEAVY',hp:245,shields:165,acceleration:5.8,turn:.91,maxSpeed:20,laserDamage:24,laserDelay:.36,missileDamage:83,missileDelay:4.1,missileAmmo:7,flares:2,radius:1.04,color:'#c2a2ff',lockTime:1.85}
};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lcg=seed=>{let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}};
export function segmentSphere(start,end,center,radius){
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
 const fx=start.x-center.x,fy=start.y-center.y,fz=start.z-center.z;
 const a=dx*dx+dy*dy+dz*dz;if(a<1e-12)return fx*fx+fy*fy+fz*fz<=radius*radius?0:null;
 const b=2*(fx*dx+fy*dy+fz*dz),c=fx*fx+fy*fy+fz*fz-radius*radius;
 if(c<=0)return 0;const delta=b*b-4*a*c;if(delta<0)return null;
 const t=(-b-Math.sqrt(delta))/(2*a);return t>=0&&t<=1?t:null;
}
export function assignTeams(mode,humanCount=2){const count=clamp(Math.floor(humanCount),1,2);return Array.from({length:4},(_,i)=>({slot:i,human:i<count,team:mode==='teams'?(i<2?0:1):i}));}
export function applyDamage(state,amount){if(!state||state.hp<=0)return {absorbed:0,dealt:0,killed:false};const shield=Math.min(Math.max(0,state.shields||0),amount);state.shields=Math.max(0,(state.shields||0)-shield);const dealt=Math.max(0,amount-shield);state.hp=Math.max(0,state.hp-dealt);return {absorbed:shield,dealt,killed:state.hp===0};}
export function findWinner(ships){const alive=ships.filter(s=>s.hp>0);const teams=new Set(alive.map(s=>s.team));if(!alive.length)return {team:-1,survivors:0};if(teams.size!==1)return null;return {team:alive[0].team,survivors:alive.length};}
export const calculatePlanetDamage=(type,amount)=>amount*(type==='missile'?3.6:1.65);
export const travelTime=(distance,speed)=>speed>0?distance/speed:Infinity;
// Solve ||R + V*t|| = projectileSpeed*t. Returns an intercept time, or null if uncatchable.
export function interceptTime(relativePosition,relativeVelocity,projectileSpeed){
 const x=relativePosition.x,y=relativePosition.y,z=relativePosition.z;
 const vx=relativeVelocity.x,vy=relativeVelocity.y,vz=relativeVelocity.z;
 const a=vx*vx+vy*vy+vz*vz-projectileSpeed*projectileSpeed;
 const b=2*(x*vx+y*vy+z*vz),c=x*x+y*y+z*z;
 if(c<1e-8)return 0;
 if(Math.abs(a)<1e-8)return b<0?-c/b:null;
 const d=b*b-4*a*c;if(d<0)return null;const root=Math.sqrt(d);
 const t1=(-b-root)/(2*a),t2=(-b+root)/(2*a);
 const vals=[t1,t2].filter(t=>t>0);return vals.length?Math.min(...vals):null;
}
export function predictIntercept(shooter,target,targetVelocity,shooterVelocity,speed){
 const delta={x:target.x-shooter.x,y:target.y-shooter.y,z:target.z-shooter.z};
 const relative={x:targetVelocity.x-shooterVelocity.x,y:targetVelocity.y-shooterVelocity.y,z:targetVelocity.z-shooterVelocity.z};
 const time=interceptTime(delta,relative,speed);
 if(time===null)return {time:null,point:{...target}};
 return {time,point:{x:target.x+targetVelocity.x*time,y:target.y+targetVelocity.y*time,z:target.z+targetVelocity.z*time}};
}
export function advanceLock(previous,eligible,deltaSeconds,requiredSeconds){
 const value=eligible?clamp(previous+deltaSeconds/requiredSeconds,0,1):clamp(previous-deltaSeconds/Math.max(.3,requiredSeconds*.4),0,1);
 return {progress:value,locked:value>=1};
}
// Steering demand from target line of sight, with a hard limit on angular change.
export function limitedTurnAngle(currentErrorRadians,turnRateRadians,dt){return clamp(currentErrorRadians,-turnRateRadians*dt,turnRateRadians*dt);}
export function flareInterceptDistance(missile,flare){return Math.hypot(missile.x-flare.x,missile.y-flare.y,missile.z-flare.z);}
