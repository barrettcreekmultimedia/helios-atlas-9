import * as pc from 'playcanvas';
import {BODIES} from './data.js';
import {textureCandidates} from './atlas.js';
import {clamp,lcg} from './rules.js';
import {c,material,add,fragment,makeFragmentMesh,randBetween} from './graphics.js';
const TAU=Math.PI*2,rng=lcg(927811);
const V=(x=0,y=0,z=0)=>new pc.Vec3(x,y,z);
function sphereMesh(device){const p=[],norm=[],uv=[],idx=[],stacks=64,slices=128;
 for(let i=0;i<=stacks;i++){const lat=Math.PI/2-i*Math.PI/stacks;for(let j=0;j<=slices;j++){const lon=-Math.PI+j*TAU/slices;const x=Math.cos(lat)*Math.sin(lon),y=Math.sin(lat),z=-Math.cos(lat)*Math.cos(lon);p.push(x*.5,y*.5,z*.5);norm.push(x,y,z);uv.push(j/slices,1-i/stacks)}}
 for(let i=0;i<stacks;i++)for(let j=0;j<slices;j++){const a=i*(slices+1)+j,b=a+1,d=a+slices+1,e=d+1;idx.push(a,b,d,b,e,d)}
 const mesh=new pc.Mesh(device);mesh.setPositions(p);mesh.setNormals(norm);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update();return mesh;
}
function tryTexture(device,urls,done){let k=0;function attempt(){if(k>=urls.length)return;const url=urls[k++],img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const t=new pc.Texture(device,{format:pc.PIXELFORMAT_RGBA8,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR,mipmaps:true});t.addressU=pc.ADDRESS_REPEAT;t.addressV=pc.ADDRESS_CLAMP_TO_EDGE;t.setSource(img);done(t,url)}catch(e){attempt()}};img.onerror=attempt;img.src=url;}attempt()}
function starfield(app){const groups=[[],[],[],[]],colors=['#9ebde9','#e2f1ff','#c7b8d7','#ffffff'];for(let i=0;i<6800;i++){const a=rng()*TAU,h=rng()*2-1,r=1800+rng()*500,f=Math.sqrt(1-h*h);groups[i%4].push(Math.cos(a)*f*r,h*r,Math.sin(a)*f*r)}
 for(let i=0;i<4;i++){const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(groups[i]);mesh.update(pc.PRIMITIVE_POINTS);const e=new pc.Entity('Ancient starfield');e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material(colors[i],.8),e)]});app.root.addChild(e)}}
export function createUniverse(app,onEvent=()=>{}){
 const bodyMesh=sphereMesh(app.graphicsDevice),shardMesh=makeFragmentMesh(app.graphicsDevice);
 const worlds=new Map(),debris=[],effects=[],asteroids=[],structures=[];starfield(app);
 const sunLight=new pc.Entity('Remote stellar light');sunLight.addComponent('light',{type:'directional',color:new pc.Color(1,.9,.83),intensity:2.7,castShadows:false});sunLight.setLocalEulerAngles(42,28,11);app.root.addChild(sunLight);
 app.scene.ambientLight=new pc.Color(.35,.38,.44);
 for(const d of BODIES){
  const root=new pc.Entity(d.name);app.root.addChild(root);root.setPosition(...d.pos);
  const visual=new pc.Entity('Mapped world / '+d.name);root.addChild(visual);
  const surface=new pc.StandardMaterial();surface.diffuse=new pc.Color(1,1,1);surface.emissive=new pc.Color(.18,.16,.17);surface.emissiveIntensity=.32;surface.gloss=.18;surface.update();
  visual.addComponent('render',{meshInstances:[new pc.MeshInstance(bodyMesh,surface,visual)]});visual.setLocalScale(d.size*2,d.size*2,d.size*2);
  tryTexture(app.graphicsDevice,[`assets/${d.texture}.jpg`],tex=>{surface.diffuseMap=tex;surface.update()});
  if(['jupiter','io','europa','ganymede','moon'].includes(d.texture))tryTexture(app.graphicsDevice,textureCandidates(d.texture).slice(0,-1),tex=>{surface.diffuseMap=tex;surface.update()});
  if(d.id==='jupiter'){
   const haze=material('#88bdda',.4);haze.useLighting=false;haze.opacity=.1;haze.blendType=pc.BLEND_NORMAL;haze.depthWrite=false;haze.cull=pc.CULLFACE_NONE;haze.update();
   const shell=new pc.Entity('Blue atmospheric limb');shell.addComponent('render',{meshInstances:[new pc.MeshInstance(bodyMesh,haze,shell)]});shell.setLocalScale(d.size*2.035,d.size*2.035,d.size*2.035);root.addChild(shell);
   const corona=material('#dfad8c',1.1);corona.opacity=.035;corona.blendType=pc.BLEND_NORMAL;corona.depthWrite=false;corona.cull=pc.CULLFACE_NONE;corona.update();
   const halo=new pc.Entity('Atmospheric scattering glow');halo.addComponent('render',{meshInstances:[new pc.MeshInstance(bodyMesh,corona,halo)]});halo.setLocalScale(d.size*2.12,d.size*2.12,d.size*2.12);root.addChild(halo);
  }
  const b={id:d.id,name:d.name,kind:d.kind,group:d.group,data:d,root,visual,material:surface,position:V(...d.pos),radius:d.size,alive:true,maxHp:d.hp,hp:d.hp,hitFlash:0,scars:[]};worlds.set(d.id,b);
 }
 const rockMesh=shardMesh,rockMats=['#5e6877','#77747b','#a19089','#918d95'].map(x=>material(x));
 for(let i=0;i<145;i++){
  const angle=rng()*TAU,height=(rng()-.5)*116,rad=138+rng()*148;
  const position=V(Math.cos(angle)*rad,height,Math.sin(angle)*rad);let radius=.8+rng()*3.5;
  if([[ -23,2,205],[23,-5,203],[-22,7,151],[21,-8,154]].some(a=>position.distance(V(...a))<12))continue;
  const ent=fragment(app,rockMesh,rockMats[i%rockMats.length],'Breakable asteroid '+i);
  ent.setPosition(position);ent.setLocalScale(radius*1.2,radius*(.55+rng()),radius*.9);ent.setLocalEulerAngles(rng()*360,rng()*360,rng()*360);
  asteroids.push({id:'rock-'+i,ent,position,radius,hp:45+radius*24,alive:true});
 }
 const stationMat=material('#6b8294'),pane=material('#72d9ed',1.35),structureOffsets=[[0,32,182],[122,-32,-103],[-153,40,91],[86,9,185]];
 for(let i=0;i<structureOffsets.length;i++){
  const position=V(...structureOffsets[i]),root=new pc.Entity('Destructible frontier relay '+(i+1));app.root.addChild(root);root.setPosition(position);
  add(root,'Relay central hub','box',[0,0,0],[5,3,8],stationMat);add(root,'Sensor dome','sphere',[0,2,0],[3,2.5,3],pane);
  for(const sign of [-1,1]){add(root,'Extended solar truss','box',[sign*9,0,0],[13,.8,.8],stationMat);add(root,'Photovoltaic wings','box',[sign*15,0,0],[14,.1,8],material('#2b556b'));add(root,'Comms mast','cylinder',[sign*3,4,0],[.22,8,.22],stationMat)}
  structures.push({id:'relay-'+i,name:'RELAY '+(i+1),ent:root,position,radius:7,hp:170,alive:true});
 }
 function burst(position,hex,count=16,power=7){const m=material(hex,2);count=Math.min(42,count);
  for(let i=0;i<count;i++){const size=.14+randBetween(0,.32);const ent=add(app.root,'Impact flash','sphere',[position.x,position.y,position.z],[size,size,size],m);
   const v=V(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize().mulScalar(randBetween(power*.35,power));effects.push({ent,pos:position.clone(),vel:v,life:randBetween(.25,.9),age:0});}
  while(effects.length>400){effects.shift().ent.destroy()}
 }
 function spawnShards(body,origin,impactVelocity){const count=body.id==='jupiter'?74:body.radius>15?38:26;
  for(let i=0;i<count;i++){const n=V(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize();
   const sr=body.radius*randBetween(.045,.14),pos=origin.clone().add(n.clone().mulScalar(body.radius*randBetween(.1,.83)));
   const ent=fragment(app,shardMesh,body.material,'Persistent world debris / '+body.name);ent.setPosition(pos);ent.setLocalScale(sr*1.1,sr*randBetween(.7,1.45),sr);ent.setLocalEulerAngles(rng()*360,rng()*360,rng()*360);
   const vel=n.clone().mulScalar(randBetween(2.5,11.8)).add(impactVelocity?.clone().mulScalar(.12)||V());
   debris.push({ent,pos,vel,radius:sr,hp:Math.max(18,sr*32),rot:V(randBetween(-40,40),randBetween(-45,45),randBetween(-40,40)),source:body.id});}
  while(debris.length>230){debris.shift().ent.destroy()}
 }
 function explodeWorld(b,source,velocity){if(!b?.alive)return false;b.alive=false;b.hp=0;b.root.enabled=false;
  burst(b.position,b.data.color,42,28);spawnShards(b,b.position,velocity);onEvent('planetDestroyed',{id:b.id,name:b.name,by:source});return true;}
 function damagePlanet(b,amount,by,vel){if(!b?.alive)return false;b.hp=Math.max(0,b.hp-amount);b.hitFlash=.35;
  if(b.hp===0)return explodeWorld(b,by,vel);
  if(b.scars.length<12){const n=V(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize();const dot=add(b.root,'Planet damage scar','sphere',[n.x*b.radius*1.005,n.y*b.radius*1.005,n.z*b.radius*1.005],[b.radius*.08,b.radius*.018,b.radius*.08],material('#ff714d',.7));dot.lookAt(n.clone().mulScalar(b.radius*3));b.scars.push(dot)}
  return false;
 }
 function destroyAsteroid(a,by){if(!a?.alive)return;a.alive=false;a.ent.enabled=false;burst(a.position,'#ffc29d',12,8);
  for(let i=0;i<4;i++){const n=V(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize(),r=a.radius*.43,pos=a.position.clone().add(n.clone().mulScalar(a.radius*.35));const ent=fragment(app,rockMesh,rockMats[i%rockMats.length],'Rock fragment');ent.setPosition(pos);ent.setLocalScale(r,r*.8,r);debris.push({ent,pos,vel:n.mulScalar(randBetween(2,6)),radius:r,hp:10,rot:V(26,38,40),source:'asteroid'});}onEvent('asteroidDestroyed',{by});}
 function destroyStructure(s,by){if(!s?.alive)return;s.alive=false;s.ent.enabled=false;burst(s.position,'#78d8ff',24,12);
  for(let i=0;i<12;i++){const n=V(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize(),r=randBetween(.4,2.3),pos=s.position.clone().add(n.clone().mulScalar(randBetween(1,4)));const ent=fragment(app,shardMesh,stationMat,'Station wreckage');ent.setPosition(pos);ent.setLocalScale(r,r*.6,r*1.5);debris.push({ent,pos,vel:n.mulScalar(randBetween(3,11)),radius:r,hp:16,rot:V(31,18,42),source:s.id});}onEvent('structureDestroyed',{id:s.id,name:s.name,by});}
 function update(dt){
  for(const b of worlds.values()){if(!b.alive)continue;b.visual.rotateLocal(0,dt*(b.id==='jupiter'?.7:.26),0);if(b.hitFlash>0){b.hitFlash=Math.max(0,b.hitFlash-dt);b.material.emissiveIntensity=.32+b.hitFlash*3;b.material.update();}}
  for(const d of debris){d.pos.add(d.vel.clone().mulScalar(dt));d.vel.mulScalar(Math.exp(-dt*.003));d.ent.setPosition(d.pos);d.ent.rotateLocal(d.rot.x*dt,d.rot.y*dt,d.rot.z*dt);
   for(const b of worlds.values()){if(!b.alive)continue;const off=d.pos.clone().sub(b.position),len=off.length();if(len<b.radius+d.radius){const n=off.normalize();d.pos.copy(b.position).add(n.clone().mulScalar(b.radius+d.radius+.1));const inward=d.vel.dot(n);if(inward<0)d.vel.sub(n.mulScalar(inward*1.5));break}}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;e.pos.add(e.vel.clone().mulScalar(dt));e.ent.setPosition(e.pos);const f=Math.max(.01,(1-e.age/e.life)*.4);e.ent.setLocalScale(f,f,f);if(e.age>e.life){e.ent.destroy();effects.splice(i,1)}}
 }
 return {worlds,asteroids,structures,debris,update,burst,damagePlanet,destroyAsteroid,destroyStructure,explodeWorld,spawnShards,get(id){return worlds.get(id)}};
}
