import test from 'node:test';
import assert from 'node:assert/strict';
import {interceptTime,predictIntercept,advanceLock,limitedTurnAngle,SHIP_CLASSES,segmentSphere,calculatePlanetDamage} from '../src/rules.js';
const P=(x=0,y=0,z=0)=>({x,y,z});
test('predictive laser lead is forward of moving target',()=>{
 const r=predictIntercept(P(),P(0,0,60),P(10,0,0),P(),90);
 assert.ok(r.time>.5&&r.time<1);assert.ok(r.point.x>5);assert.equal(r.point.z,60);
});
test('unreachable intercept is reported instead of inventing a hit',()=>{
 assert.equal(interceptTime(P(30,0,0),P(100,0,0),90),null);
});
test('missile lock requires sustained cone alignment',()=>{
 let value=0;for(let i=0;i<14;i++)value=advanceLock(value,true,.1,1.5).progress;
 assert.ok(value<1);value=advanceLock(value,true,.2,1.5).progress;
 assert.equal(value,1);const dropped=advanceLock(value,false,.4,1.5);
 assert.ok(dropped.progress<1);assert.equal(dropped.locked,false);
});
test('missile turn authority cannot snap instantly',()=>{
 assert.ok(Math.abs(limitedTurnAngle(Math.PI,1.5,.1)-.15)<1e-9);
 assert.ok(Math.abs(limitedTurnAngle(-Math.PI,1.5,.1)+.15)<1e-9);
});
test('slower differentiated combat flight classes and finite ammunition',()=>{
 for(const s of Object.values(SHIP_CLASSES)){
  assert.ok(s.maxSpeed<=30);
  assert.ok(s.acceleration<=11);
  assert.ok(s.missileAmmo>=5&&s.missileAmmo<=12);
  assert.ok(s.lockTime>=1);
  assert.ok(s.flares>0);
 }
 assert.ok(SHIP_CLASSES.interceptor.turn>SHIP_CLASSES.fighter.turn);
 assert.ok(SHIP_CLASSES.fighter.turn>SHIP_CLASSES.dreadnought.turn);
});
test('planet blocks line-of-sight as mathematical segment collision',()=>{
 assert.notEqual(segmentSphere(P(-150,0,0),P(150,0,0),P(),96),null);
 assert.equal(segmentSphere(P(-150,130,0),P(150,130,0),P(),96),null);
});
test('planet demolition requires multiple missiles',()=>{
 assert.ok(calculatePlanetDamage('missile',62)<2200);
});
