import test from 'node:test';
import assert from 'node:assert/strict';
const moduleExists = await import('node:fs').then(fs => fs.existsSync(new URL('../scene.mjs',import.meta.url)));
let scene;
if (moduleExists) scene = await import('../scene.mjs');

test('real JavaScript motion module exists', () => assert.ok(moduleExists,'Missing actual JS scene controller'));
test('progress clamps out-of-range scroll', {skip:!moduleExists}, () => {
  assert.equal(scene.clamp(-3,0,1),0);
  assert.equal(scene.clamp(5,0,1),1);
  assert.equal(scene.sceneProgress(0,1000),0);
  assert.equal(scene.sceneProgress(500,1000),0.5);
  assert.equal(scene.sceneProgress(2500,1000),1);
  assert.equal(scene.sceneProgress(20,0),1);
});
test('embers animate with time and stay within wrap bounds', {skip:!moduleExists}, () => {
  const seed = {x:.3,y:.8,speed:.3,phase:1,size:2};
  const a = scene.particleAt(seed,0,1200,800);
  const b = scene.particleAt(seed,2,1200,800);
  assert.notEqual(a.y,b.y);
  for (const t of [0,1,10000]) {
    const p=scene.particleAt(seed,t,1200,800);
    assert.ok(p.x >= -50 && p.x <= 1250);
    assert.ok(p.y >= -50 && p.y <= 850);
    assert.ok(p.alpha >= 0 && p.alpha <= 1);
  }
});
function browser(reduced=false) {
  const events = new Map(), docEvents = new Map(), prefEvents = new Map(), buttonEvents = new Map();
  const styles = new Map(), frames = new Map(), buttonAttrs = new Map();
  let count=0;
  const toggles=new Set();
  const root={style:{setProperty:(k,v)=>styles.set(k,v)},classList:{toggle:(n,on)=>on?toggles.add(n):toggles.delete(n)}};
  const pref={matches:reduced,addEventListener:(t,f)=>prefEvents.set(t,f),removeEventListener:(t)=>prefEvents.delete(t)};
  const button={hidden:true,setAttribute:(k,v)=>buttonAttrs.set(k,v),addEventListener:(t,f)=>buttonEvents.set(t,f),removeEventListener:(t)=>buttonEvents.delete(t),querySelector:()=>null};
  const doc={documentElement:root,hidden:false,getElementById:(id)=>id==='motion-toggle'?button:null,querySelectorAll:()=>[],addEventListener:(t,f)=>docEvents.set(t,f),removeEventListener:t=>docEvents.delete(t)};
  const win={innerWidth:1200,innerHeight:800,scrollY:0,devicePixelRatio:2,matchMedia:()=>pref,addEventListener:(t,f)=>events.set(t,f),removeEventListener:t=>events.delete(t),requestAnimationFrame:f=>{frames.set(++count,f);return count},cancelAnimationFrame:id=>frames.delete(id)};
  return {window:win,document:doc,events,docEvents,prefEvents,pref,styles,frames,buttonEvents,buttonAttrs,button,toggles};
}
test('controller schedules real frames, responds to scroll, manual pause and hidden tabs', {skip:!moduleExists}, () => {
  const env=browser();const control=scene.createMotionController(env);
  assert.equal(env.button.hidden,false);
  assert.equal(control.isPaused(),false);
  assert.equal(env.frames.size,1);
  env.window.scrollY=400;env.events.get('scroll')();
  let [id,frame]=env.frames.entries().next().value;env.frames.delete(id);frame(16);
  assert.ok(Number.parseFloat(env.styles.get('--scroll-p'))>0);
  control.setPaused(true);assert.equal(env.frames.size,0);assert.equal(control.isPaused(),true);
  assert.equal(env.buttonAttrs.get('aria-pressed'),'true');
  control.setPaused(false);assert.equal(env.frames.size,1);
  env.document.hidden=true;env.docEvents.get('visibilitychange')();assert.equal(env.frames.size,0);
  env.document.hidden=false;env.docEvents.get('visibilitychange')();assert.equal(env.frames.size,1);
  control.destroy();assert.equal(env.frames.size,0);assert.equal(env.events.size,0);
});
test('reduced motion starts still and responds to preference changes', {skip:!moduleExists}, () => {
  const env=browser(true);const control=scene.createMotionController(env);
  assert.equal(control.isPaused(),true);assert.equal(env.frames.size,0);
  assert.equal(env.buttonAttrs.get('aria-pressed'),'true');
  env.pref.matches=false;env.prefEvents.get('change')();
  assert.equal(control.isPaused(),false);assert.equal(env.frames.size,1);
  control.destroy();
});
test('real renderer caps DPR, draws particles and applies pointer/scroll parallax', {skip:!moduleExists}, () => {
  const env=browser();
  const layerStyles=new Map();
  const layer={dataset:{depth:'.5'},style:{setProperty:(k,v)=>layerStyles.set(k,v)},getBoundingClientRect:()=>({top:0,height:800})};
  let drawCount=0,clearCount=0,transform;
  const ctx={clearRect:()=>clearCount++,setTransform:(...args)=>transform=args,beginPath:()=>{},ellipse:()=>{},fill:()=>drawCount++};
  const canvas={width:0,height:0,getContext:()=>ctx};
  const originalGet=env.document.getElementById;
  env.document.getElementById=id=>id==='embers'?canvas:originalGet(id);
  env.document.querySelectorAll=()=>[layer];
  const control=scene.createMotionController(env);
  assert.equal(canvas.width,1800);assert.equal(canvas.height,1200);assert.equal(transform[0],1.5);
  env.events.get('pointermove')({pointerType:'mouse',clientX:1200,clientY:800});
  env.window.scrollY=400;env.events.get('scroll')();
  const [id,frame]=env.frames.entries().next().value;env.frames.delete(id);frame(32);
  assert.equal(drawCount,34);assert.ok(clearCount>0);
  assert.ok(Number.parseFloat(layerStyles.get('--depth-x'))>0);
  assert.ok(Number.parseFloat(layerStyles.get('--depth-y'))>0);
  control.setPaused(true);assert.equal(layerStyles.get('--depth-x'),'0px');assert.equal(env.frames.size,0);
  control.destroy();
});
test('mobile renderer uses the smaller ember budget', {skip:!moduleExists}, () => {
  const env=browser();env.window.innerWidth=390;env.window.innerHeight=844;
  let draws=0;
  const canvas={getContext:()=>({clearRect:()=>{},setTransform:()=>{},beginPath:()=>{},ellipse:()=>{},fill:()=>draws++})};
  const originalGet=env.document.getElementById;
  env.document.getElementById=id=>id==='embers'?canvas:originalGet(id);
  const control=scene.createMotionController(env);
  const [id,frame]=env.frames.entries().next().value;env.frames.delete(id);frame(32);
  assert.equal(draws,14);control.destroy();
});
