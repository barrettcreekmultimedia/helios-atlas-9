import * as pc from 'playcanvas';
import {createUniverse} from './world.js';
import {ArenaGame} from './combat.js';
import {SHIP_CLASSES} from './rules.js';
import {createSpaceScore} from './music.js';
const $=id=>document.getElementById(id);
const config={mode:'teams',humans:2,difficulty:'standard',p1:'fighter',p2:'interceptor',assist:.14};
const keys=new Set(),mouseButtons=new Set();let mouseDX=0,mouseDY=0;
let app=null,universe=null,game=null,ready=false,started=false,paused=false,lastHud=0;
let soundOn=true,sfx=null,soundTime=0,score=null,lastBanner=0;
const lastPadButtons={};
function notice(text){$('engine-status').textContent=text}
function showSection(id,show){$(id).hidden=!show}
for(const [group,key,transform] of [['mode-choices','mode',v=>v],['human-choices','humans',Number]]){
 for(const el of $(group).querySelectorAll('button'))el.addEventListener('click',()=>{
  $(group).querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===el));
  config[key]=transform(el.dataset[key]);
  if(key==='humans')$('pilot2-selector').style.opacity=config.humans===1?'.32':'1';
 });
}
$('assist-choice').addEventListener('change',e=>config.assist=Number(e.target.value));
$('bot-choice').addEventListener('change',e=>config.difficulty=e.target.value);
for(const [id,key] of [['ship-p1','p1'],['ship-p2','p2']])$(id).addEventListener('change',e=>{config[key]=e.target.value;updatePreview()});
function updatePreview(){const c=SHIP_CLASSES[config.p1];$('class-title').textContent=c.name;$('class-specs').textContent=c.tag;
 const desc={interceptor:'Needle-thin interceptor. Blistering acceleration, tight turns, lightweight shields and rapid pulse fire.',fighter:'A balanced multirole strike craft with reinforced armour, reliable weapons and precision handling.',dreadnought:'Heavy battle vessel. Thick hull and shields, high-damage projectiles and deliberate acceleration.'};
 $('class-description').textContent=desc[config.p1];
 $('stat-thrust').style.width=Math.round(c.acceleration/10*100)+'%';$('stat-armour').style.width=Math.round(c.hp/235*100)+'%';$('stat-weapons').style.width=Math.round(c.laserDamage/24*100)+'%';
}
updatePreview();
function initAudio(){if(sfx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const ctx=new AC();ctx.resume?.();const master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination);
 const play=(freq,duration=.2,type='triangle',vol=.12,sweep=1)=>{if(!soundOn)return;const t=ctx.currentTime;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(15,freq*sweep),t+duration);gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.01)};
 sfx={ctx,play,lock(){play(920,.16,'square',.09,1.24)},tick(){play(430,.08,'sine',.035,1.12)},flare(){play(380,.35,'triangle',.1,.47)},shot(){if(performance.now()-soundTime<75)return;soundTime=performance.now();play(420,.085,'sawtooth',.12,.4)},missile(){play(180,.25,'sawtooth',.16,2.3)},explosion(){play(105,.8,'sawtooth',.25,.12)},select(){play(780,.10,'sine',.06,1.28)},winner(){play(490,.7,'triangle',.12,1.6)}};
 score=createSpaceScore();score.start();score.setTravel(.7);
}
function banner(kicker,title,detail){$('event-kicker').textContent=kicker;$('event-title').textContent=title;$('event-detail').textContent=detail;showSection('event-banner',true);lastBanner=performance.now();}
function feed(text){const root=$('killfeed'),item=document.createElement('div');item.textContent=text;root.prepend(item);while(root.children.length>4)root.lastChild.remove();setTimeout(()=>item.remove(),4500)}
function onGameEvent(type,data){if(type==='shoot'){if(data.owner<config.humans){if(data.type==='laser')sfx?.shot();else sfx?.missile()}}
 else if(type==='kill'){const killer=data.by==null?'THE ENVIRONMENT':game?.ships[data.by]?.name||'UNKNOWN';feed(`${killer}  ✕  ${game?.ships[data.victim]?.name||'VESSEL'} / ${data.cause.toUpperCase()}`);sfx?.explosion();}
 else if(type==='winner'){showResult(data);sfx?.winner();score?.setTravel(.05)}
 else if(type==='planetDestroyed'){banner('CELESTIAL BREAKUP DETECTED',data.name.toUpperCase()+' SHATTERED','Fragments now drifting through the combat zone');feed(`${data.name.toUpperCase()} DESTROYED — DEBRIS FIELD ACTIVE`);sfx?.explosion();}
 else if(type==='asteroidDestroyed'){if(Math.random()<.15)feed('ASTEROID FRACTURED / DEBRIS RELEASED');}
 else if(type==='targetMode'||type==='target')sfx?.select();
 else if(type==='lock'){if(data.pilot<config.humans){sfx?.lock();feed('PILOT '+(data.pilot+1)+' · THERMAL LOCK ACQUIRED')}}
 else if(type==='flare'){sfx?.flare();if(data.pilot<config.humans)feed('PILOT '+(data.pilot+1)+' · COUNTERMEASURES DEPLOYED')}
 else if(type==='structureDestroyed'){banner('STRUCTURAL COLLAPSE',data.name+' DESTROYED','Wreckage entering the combat space');sfx?.explosion();}
}
function showResult(result){if(!game)return;
 showSection('result-screen',true);document.exitPointerLock?.();
 let label='DRAW / ALL SHIPS LOST';if(result.team>=0){if(config.mode==='teams')label=result.team===0?'TEAM AZURE WINS':'TEAM CRIMSON WINS';else label=game.ships.find(s=>s.team===result.team)?.name+' IS VICTORIOUS';}
 $('result-title').textContent=label;
 $('result-subtitle').textContent=`${Math.round(game.elapsed)} seconds fought · ${game.planetsDestroyed} worlds destroyed · ${game.projectilesFired} shots fired`;
 const list=$('result-stats');list.replaceChildren();for(const s of game.ships){const box=document.createElement('div');box.innerHTML=`<b>${s.kills}</b><small>${s.name} KILLS</small>`;list.appendChild(box)}
}
function setPause(val){if(!started||game?.over)return;paused=val;game.paused=val;showSection('pause-screen',val);$('pause-btn').textContent=val?'▶ RESUME':'Ⅱ PAUSE';if(val)document.exitPointerLock?.();}
$('pause-btn').addEventListener('click',()=>setPause(!paused));$('resume-btn').addEventListener('click',()=>setPause(false));
function returnToMenu(){window.location.reload()}
$('menu-btn').addEventListener('click',returnToMenu);$('pause-menu-btn').addEventListener('click',returnToMenu);$('rematch-btn').addEventListener('click',returnToMenu);
$('audio-toggle').addEventListener('click',()=>{soundOn=!soundOn;$('audio-toggle').textContent=soundOn?'♫ SOUND ON':'♫ SOUND OFF';score?.setEnabled(soundOn);if(sfx)sfx.ctx.resume?.();});
function human(i){return game?.humanShip(i)}
for(const [id,pilot,type] of [['p1-next',0,'next'],['p2-next',1,'next'],['p1-mode',0,'mode'],['p2-mode',1,'mode'],['p1-view',0,'view'],['p2-view',1,'view'],['p1-flare',0,'flare'],['p2-flare',1,'flare']])$(id).addEventListener('click',()=>{const s=human(pilot);if(!s)return;type==='mode'?game.toggleTargetMode(s):type==='view'?game.toggleView(s):type==='flare'?game.launchFlares(s):game.cycleTarget(s,1);sfx?.select()});
function handleKeyDown(e){const isEdit=['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName);
 if(isEdit)return;
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(!started||!game||e.repeat)return;
 if(e.code==='Escape'||e.code==='KeyP'){setPause(!paused);return}
 if(paused||game.over)return;
 const s1=human(0),s2=human(1);
 if(e.code==='Tab')game.cycleTarget(s1,1);
 if(e.code==='KeyT')game.toggleTargetMode(s1);
 if(e.code==='Enter')game.cycleTarget(s2,1);
 if(e.code==='KeyY')game.toggleTargetMode(s2);
 if(e.code==='KeyV')game.toggleView(s1);
 if(e.code==='KeyO')game.toggleView(s2);
 if(e.code==='KeyG')game.launchFlares(s1);
 if(e.code==='KeyU')game.launchFlares(s2);
}
document.addEventListener('keydown',handleKeyDown);document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();mouseButtons.clear();mouseDX=mouseDY=0});
const canvas=$('application');
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(!started||paused||game?.over)return;e.preventDefault();if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});mouseButtons.add(e.button)});
document.addEventListener('mouseup',e=>mouseButtons.delete(e.button));
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){mouseDX+=e.movementX;mouseDY+=e.movementY}});
function deadzone(x,d=.13){return Math.abs(x)<d?0:Math.sign(x)*(Math.abs(x)-d)/(1-d)}
function pollGamepad(s,input){if(!navigator.getGamepads)return;const pads=[...navigator.getGamepads()].filter(Boolean);const gp=pads[0];if(!gp)return;
 const pilot=config.humans===2?human(1):human(0);if(!pilot||s.id!==pilot.id)return;
 const ax=gp.axes||[],b=gp.buttons||[],v=n=>b[n]?.value||0,down=n=>!!b[n]?.pressed;
 input.yaw-=deadzone(ax[2]||0)*1.3;input.pitch-=deadzone(ax[3]||0)*1.3;
 input.strafe+=deadzone(ax[0]||0);input.thrust-=deadzone(ax[1]||0);
 input.primary ||= v(7)>.3||down(0);input.secondary ||= v(6)>.3||down(1);
 input.boost ||= down(5);input.brake ||= down(4);
 const key='gp0'+s.id,now=[down(2),down(3),down(10)],before=lastPadButtons[key]||[false,false,false];
 if(now[0]&&!before[0])game.launchFlares(s);
 if(now[1]&&!before[1])game.cycleTarget(s,1);
 if(now[2]&&!before[2])game.toggleView(s);
 lastPadButtons[key]=now;
}
const active=code=>keys.has(code);
function getInputs(){const result={};if(!game)return result;
 const s1=human(0);if(s1){result[0]={thrust:Number(active('KeyW'))-Number(active('KeyS')),strafe:Number(active('KeyD'))-Number(active('KeyA')),
  vertical:Number(active('Space'))-Number(active('KeyC')),roll:Number(active('KeyE'))-Number(active('KeyQ')),
  mouseX:-mouseDX,mouseY:-mouseDY,boost:active('ShiftLeft'),brake:active('KeyX'),primary:mouseButtons.has(0)||active('KeyF'),secondary:mouseButtons.has(2)||active('KeyR')};pollGamepad(s1,result[0]);}
 const s2=human(1);if(s2){result[1]={thrust:Number(active('KeyI'))-Number(active('KeyK')),strafe:Number(active('KeyL'))-Number(active('KeyJ')),
  vertical:Number(active('Period'))-Number(active('Comma')),yaw:Number(active('ArrowLeft'))-Number(active('ArrowRight')),
  pitch:Number(active('ArrowUp'))-Number(active('ArrowDown')),roll:Number(active('BracketRight'))-Number(active('BracketLeft')),
  boost:active('ShiftRight'),brake:active('Backspace'),primary:active('KeyN'),secondary:active('KeyM')};pollGamepad(s2,result[1]);}
 mouseDX=mouseDY=0;return result;
}
// Project using the pilot camera's own split-screen aspect ratio, not the full canvas.
function projectToPilot(ship,point){if(!ship?.camera||!point)return null;
 const camera=ship.camera,delta=point.clone().sub(camera.getPosition()),inverse=camera.getRotation().clone().invert(),local=inverse.transformVector(delta,new pc.Vec3());
 const depth=-local.z;if(depth<=.05)return {x:local.x>=0?1:0,y:local.y>=0?0:1,visible:false,behind:true};
 const viewportHeight=$('application').clientHeight/(config.humans===2?2:1),aspect=$('application').clientWidth/Math.max(1,viewportHeight);
 const t=Math.tan(camera.camera.fov*Math.PI/360),x=.5+local.x/(depth*t*aspect)*.5,y=.5-local.y/(depth*t)*.5;
 return {x,y,visible:x>=.03&&x<=.97&&y>=.07&&y<=.93,behind:false,depth};
}
const lastLockTone={};
function updateAimDisplay(s,prefix,status){
 const box=$(prefix+'-bracket'),lead=$(prefix+'-lead'),edge=$(prefix+'-edge'),ring=$(prefix+'-lock-ring'),incoming=$(prefix+'-incoming');
 const info=game.targetInfo(s.target),target=info?projectToPilot(s,info.position):null;
 box.hidden=!target?.visible;edge.hidden=!target||target.visible;
 if(target){if(target.visible){box.style.left=(target.x*100)+'%';box.style.top=(target.y*100)+'%';
   const size=Math.max(46,Math.min(130,720*info.radius/Math.max(1,target.depth)));box.style.width=size+'px';box.style.height=size+'px';
   $(prefix+'-bracket-name').textContent=info.name+' · '+Math.round(status.range)+' NU';
   const foe=info.kind==='ship'?game.ships[info.id]:null,relative=foe?foe.vel.clone().sub(s.vel).length():0;
   $(prefix+'-bracket-data').textContent=foe?'SH '+Math.ceil(foe.shields)+' · HULL '+Math.ceil(foe.hp)+' · ΔV '+relative.toFixed(1):'STRUCTURAL '+Math.ceil(100*info.hp/info.maxHp)+'%';}
  else {const angle=Math.atan2(target.y-.5,target.x-.5);edge.style.left=(50+Math.cos(angle)*44)+'%';edge.style.top=(50+Math.sin(angle)*38)+'%';edge.style.transform='translate(-50%,-50%) rotate('+(angle*180/Math.PI)+'deg)';}}
 const leadPoint=info?.kind==='ship'?game.getLead(s):null,pip=leadPoint?projectToPilot(s,leadPoint):null;
 lead.hidden=!pip?.visible;if(pip?.visible){lead.style.left=pip.x*100+'%';lead.style.top=pip.y*100+'%';}
 const amount=status.lockProgress||0;ring.style.background='conic-gradient('+(status.locked?'#91f7ca':'#78d8f1')+' '+Math.round(amount*360)+'deg, rgba(87,123,147,.23) '+Math.round(amount*360)+'deg)';
 $(prefix+'-lock-percent').textContent=status.locked?'✓':Math.round(amount*100)+'%';
 $(prefix+'-lock-state').textContent=status.locked?'TARGET LOCKED':status.mode==='worlds'?'WORLD TARGET / DUMBFIRE':status.target==='NO TARGET'?'ACQUIRE ENEMY':'ACQUIRING HEAT LOCK';
 $(prefix+'-lock-range').textContent=status.locked?'MISSILE SEEKER READY':status.missileAmmo===0?'MISSILES DEPLETED':status.mode==='worlds'?'NO HEAT SIGNATURE REQUIRED':'KEEP TARGET IN 14° CONE';
 incoming.hidden=status.incoming<1; if(!incoming.hidden)incoming.textContent='⚠ '+status.incoming+' INCOMING MISSILE'+(status.incoming>1?'S':'')+' · DEPLOY FLARES';
 const level=Math.floor(amount*5);if(level>0&&level<5&&lastLockTone[prefix]!==level&&s.human&&info?.kind==='ship'){lastLockTone[prefix]=level;sfx?.tick();}if(level===0||level===5)lastLockTone[prefix]=level;
}
function hudPilot(s,prefix){if(!s)return;const status=game.getShipStatus(s);
 $(prefix+'-ship-name').textContent=s.settings.name;
 $(prefix+'-team').textContent=config.mode==='teams'?'AZURE':'SOLO PILOT';
 $(prefix+'-hp').style.width=Math.round(status.hp/status.hpMax*100)+'%';$(prefix+'-hp-text').textContent=Math.round(status.hp);
 $(prefix+'-shield').style.width=Math.round(status.shield/status.shieldMax*100)+'%';$(prefix+'-shield-text').textContent=Math.round(status.shield);
 $(prefix+'-speed').textContent=status.speed.toFixed(1)+' NU/S';
 $(prefix+'-target').textContent=status.target;
 $(prefix+'-primary').textContent=status.laserHeat>.92?'OVERHEAT':status.laserCD>.05?status.laserCD.toFixed(1)+'s':'READY';
 $(prefix+'-missile').textContent=status.missileAmmo===0?'EMPTY':status.missileCD>.05?status.missileCD.toFixed(1)+'s':status.mode==='ships'&&!status.locked?'NEED LOCK':'READY';
 $(prefix+'-kills').textContent=String(status.kills).padStart(2,'0');
 $(prefix+'-ammo').textContent=status.missileAmmo+' LEFT';$(prefix+'-flares').textContent=status.flares+' READY';
 $(prefix+'-mode').textContent='TARGET: '+(status.mode==='worlds'?'PLANETS':'ENEMIES')+(s.id===0?' [T]':' [Y]');
 $(prefix+'-state').textContent=status.hp<=0?'VESSEL LOST':status.locked?'HEAT SIGNATURE LOCKED':status.targetHpMax?`WORLD INTEGRITY ${Math.round(status.targetHp/status.targetHpMax*100)}%`:'WEAPONS FREE';
 $(prefix+'-view').textContent='◉ '+(status.view==='cockpit'?'CHASE':'COCKPIT')+' ['+(s.id===0?'V':'O')+']';
 $(prefix+'-flare').textContent='✹ FLARE '+status.flares+' ['+(s.id===0?'G':'U')+']';
 updateAimDisplay(s,prefix,status);
}
function updateHUD(){if(!game)return;
 hudPilot(human(0),'p1');hudPilot(human(1),'p2');
 $('score-living').textContent=game.ships.filter(s=>s.hp>0).length+' VESSELS ACTIVE';
 $('score-planets').textContent=game.planetsDestroyed+' WORLDS DESTROYED · '+game.universe.debris.length+' RUBBLE CHUNKS';
 $('score-mode').textContent=config.mode==='teams'?'2 VS 2 / LAST TEAM STANDING':'FREE FOR ALL / LAST PILOT STANDING';
 $('round-clock').textContent=String(Math.floor(game.elapsed/60)).padStart(2,'0')+':'+String(Math.floor(game.elapsed%60)).padStart(2,'0');
 if(!$('event-banner').hidden&&performance.now()-lastBanner>4300)showSection('event-banner',false);
}
function launch(){if(!ready||!app||!universe||started)return;
 started=true;document.body.classList.toggle('solo',config.humans===1);initAudio();game=new ArenaGame(app,universe,config,onGameEvent);
 for(const s of game.ships)if(s.human){game.cycleTarget(s,0);game.updateCamera(s,1)}
 showSection('lobby',false);showSection('match-view',true);showSection('hud-p2',config.humans===2);showSection('split-divider',config.humans===2);
 $('round-state').textContent=config.mode==='teams'?'THE SHATTERED FRONTIER / 2V2':'THE SHATTERED FRONTIER / FREE FOR ALL';
 $('p1-ship-name').textContent=SHIP_CLASSES[config.p1].name;$('p2-ship-name').textContent=SHIP_CLASSES[config.p2].name;
 updateHUD();
 // Capture on a subsequent canvas click if browser does not grant it here.
 canvas.requestPointerLock?.().catch(()=>{});
}
$('launch-btn').disabled=true;$('launch-btn').addEventListener('click',launch);
function fatal(error){console.error(error);$('boot-error').hidden=false;$('boot-error').textContent='Unable to initialize the PlayCanvas Engine: '+(error?.message||String(error))+'. WebGL2 and internet access to the engine CDN are required.';notice('ENGINE ERROR')}
try{
 const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2],antialias:true});device.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.6);
 const options=new pc.AppOptions();options.graphicsDevice=device;options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];
 app=new pc.AppBase(canvas);app.init(options);app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);app.setCanvasResolution(pc.RESOLUTION_AUTO);
 universe=createUniverse(app,onGameEvent);
 app.on('update',dt=>{if(!game||paused||game.over)return;game.update(Math.min(.04,dt),getInputs());if(performance.now()-lastHud>110){lastHud=performance.now();updateHUD()}});
 window.addEventListener('resize',()=>app.resizeCanvas());app.start();ready=true;window.HELIOS_READY=true;$('launch-btn').disabled=false;notice('PLAYCANVAS READY · TACTICAL SYSTEMS ONLINE');
}catch(err){fatal(err)}
