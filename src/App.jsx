import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════ */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFrom = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function evalSlots(slots) {
  if (!slots || slots.some(s => s === null)) return null;
  let r = slots[0].val;
  for (let i = 1; i < slots.length; i += 2) {
    const op = slots[i].val, n = slots[i + 1].val;
    if (op === '+') r += n;
    else if (op === '-') r -= n;
    else if (op === '*') r *= n;
    else if (op === '/') { if (!n) return NaN; r /= n; }
  }
  return r;
}

function getFactors(n) {
  const f = [];
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) f.push([i, n / i]);
  return f;
}

/* ══════════════════════════════════════════════════════════
   THEMES — one per era, every 5 levels = new theme
══════════════════════════════════════════════════════════ */
const THEMES = [
  {
    id: 'mainframe', name: 'MAINFRAME', era: '1970s',
    lines: ['SYSTEM BOOT...', 'INITIALIZING TERMINAL...', 'READY.'],
    bg: '#050e06', panel: '#010d03',
    p: '#00ff41', s: '#00aa22', dim: '#003311', dimmer: '#001a08',
    border: '#004418', sel: '#80ffaa', gold: '#ffd700', err: '#ff4444', ok: '#44ff99',
    font: "'VT323','Courier New',monospace",
    scanlines: true,
    gridLines: false,
    holographic: false,
    gc1: '#ff00ff', gc2: '#00ffff',
  },
  {
    id: 'synthwave', name: 'SYNTHWAVE', era: '1980s',
    lines: ['NEON PROTOCOL LOADING...', 'SYNTHESIZING...', 'FEEL THE WAVE.'],
    bg: '#0d0015', panel: '#1a0028',
    p: '#ff44ff', s: '#cc00cc', dim: '#550055', dimmer: '#2a0035',
    border: '#7700aa', sel: '#ffaaff', gold: '#ffaa00', err: '#ff4455', ok: '#ff88ff',
    font: "'VT323','Courier New',monospace",
    scanlines: false,
    gridLines: true,
    holographic: false,
    gc1: '#00ffff', gc2: '#ffff00',
  },
  {
    id: 'bbs', name: 'BBS_ONLINE', era: '1990s',
    lines: ['DIALING...', 'CONNECT 28800 BAUD', 'WELCOME TO THE BBS!'],
    bg: '#000033', panel: '#000055',
    p: '#00ffff', s: '#0088ff', dim: '#003366', dimmer: '#001133',
    border: '#0055aa', sel: '#88ffff', gold: '#ffff00', err: '#ff6666', ok: '#88ffff',
    font: "'VT323','Courier New',monospace",
    scanlines: false,
    gridLines: false,
    holographic: false,
    gc1: '#ffff00', gc2: '#ff00ff',
  },
  {
    id: 'y2k', name: 'Y2K_CHROME', era: '2000s',
    lines: ['Y2K SAFE ✓', 'LOADING WINAMP...', 'YOU HAVE MAIL! (1 new message)'],
    bg: '#0a0a1a', panel: '#0d1a3a',
    p: '#00ccff', s: '#0088cc', dim: '#003355', dimmer: '#001122',
    border: '#0066aa', sel: '#88eeff', gold: '#ffcc00', err: '#ff4444', ok: '#88ffcc',
    font: "'VT323','Courier New',monospace",
    scanlines: false,
    gridLines: false,
    holographic: false,
    gc1: '#ff6600', gc2: '#00ffff',
  },
  {
    id: 'metro', name: 'METRO_FLAT', era: '2010s',
    lines: ['UPDATING...', 'INSTALLING UPDATES (1/1)...', 'SWIPE TO CONTINUE.'],
    bg: '#1a1a2e', panel: '#16213e',
    p: '#e94560', s: '#0f3460', dim: '#533483', dimmer: '#0f1929',
    border: '#533483', sel: '#ff6b8a', gold: '#ffd700', err: '#e94560', ok: '#06d6a0',
    font: "'VT323','Helvetica',sans-serif",
    scanlines: false,
    gridLines: false,
    holographic: false,
    gc1: '#06d6a0', gc2: '#ffd700',
  },
  {
    id: 'future', name: 'FUTURE::UNKNOWN', era: '2030s+',
    lines: ['TIMELINE UNDEFINED', 'REALITY.EXE LOADING...', 'YOU ARE THE SYSTEM.'],
    bg: '#000011', panel: 'rgba(0,20,50,0.7)',
    p: '#00d4ff', s: '#ff0090', dim: '#003355', dimmer: '#001122',
    border: '#005577', sel: '#88ffff', gold: '#ff00ff', err: '#ff0055', ok: '#00ffaa',
    font: "'VT323','Courier New',monospace",
    scanlines: false,
    gridLines: false,
    holographic: true,
    gc1: '#ff0090', gc2: '#00ffff',
  },
];

function getStageIdx(levelNum) {
  return Math.min(Math.floor((levelNum - 1) / 5), THEMES.length - 1);
}

/* ══════════════════════════════════════════════════════════
   LEVEL GENERATOR
══════════════════════════════════════════════════════════ */
let uid = 1000;

function makeEq3(target, ops) {
  for (const op of shuffle([...ops])) {
    for (let t = 0; t < 20; t++) {
      if (op === '+') { const a = randInt(1, target - 1); return [a, '+', target - a]; }
      if (op === '-') { const b = randInt(1, Math.min(target, 500)); return [target + b, '-', b]; }
      if (op === '*') { const f = getFactors(target); if (!f.length) continue; const [a,b] = randFrom(f); return [a,'*',b]; }
      if (op === '/') { const b = randInt(2, 15); return [target * b, '/', b]; }
    }
  }
  return [target - 1, '+', 1];
}

function makeEq5(target, ops) {
  for (let t = 0; t < 150; t++) {
    const op1 = randFrom(ops), op2 = randFrom(ops);
    const a = randInt(2, 40), b = randInt(2, 20);
    let inter;
    if (op1==='+') inter = a+b;
    else if (op1==='-') { if(a<=b) continue; inter=a-b; }
    else if (op1==='*') inter = a*b;
    else if (op1==='/') { if(!b||a%b!==0) continue; inter=a/b; }
    if (!inter || inter <= 0) continue;
    let c;
    if (op2==='+') c = target-inter;
    else if (op2==='-') c = inter-target;
    else if (op2==='*') { if(!inter||target%inter!==0) continue; c=target/inter; }
    else if (op2==='/') { if(!target||inter%target!==0) continue; c=inter/target; }
    if (!Number.isInteger(c) || c <= 0) continue;
    return [a, op1, b, op2, c];
  }
  return null;
}

function makeDecoys(count, ops, solVals) {
  const nums = solVals.filter(v => typeof v === 'number');
  const decoys = [];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      decoys.push(randFrom(ops));
    } else {
      const base = nums.length ? randFrom(nums) : randInt(1, 100);
      const spread = Math.max(2, Math.floor(base * 0.12));
      const d = Math.max(1, base + (Math.random() > 0.5 ? 1 : -1) * randInt(1, spread));
      decoys.push(d);
    }
  }
  return decoys;
}

const DIFF = ['EASY','EASY','NORMAL','NORMAL','HARD','HARD','EXPERT','EXPERT','ELITE','ELITE','GODMODE'];

function generateLevel(levelNum) {
  const step = levelNum - 5;
  const ops = step<=2?['+']:step<=5?['+','-']:step<=10?['+','-','*']:['+','-','*','/'];
  const use5 = step > 8 && Math.random() > 0.35;
  const decoys = Math.min(1 + Math.floor(step / 2), 7);
  let eq1 = use5 ? makeEq5(1337, ops) : null;
  if (!eq1) eq1 = makeEq3(1337, ops);
  const eq2 = makeEq3(42, ops);
  const solVals = [...eq1, ...eq2];
  const all = shuffle([...solVals, ...makeDecoys(decoys, ops, solVals)])
    .map(val => ({ id: `g${uid++}`, val }));
  return {
    id: levelNum,
    name: `LEVEL_${String(levelNum).padStart(2,'0')}`,
    sub: DIFF[Math.min(step-1, DIFF.length-1)],
    equations: [{ id:'e0', size:eq1.length, target:1337 }, { id:'e1', size:eq2.length, target:42 }],
    tiles: all,
    solution: [eq1, eq2],
  };
}

/* ══════════════════════════════════════════════════════════
   HANDCRAFTED LEVELS 1–5
══════════════════════════════════════════════════════════ */
const HANDCRAFTED = [
  { id:1, name:'LEVEL_01', sub:'INITIATION',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:1000},{id:'b',val:337},{id:'c',val:40},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'+'}],
    solution:[[1000,'+',337],[40,'+',2]] },
  { id:2, name:'LEVEL_02', sub:'BYPASS',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:1330},{id:'b',val:7},{id:'c',val:84},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'/'},{id:'g',val:'+'}],
    solution:[[1330,'+',7],[84,'/',2]] },
  { id:3, name:'LEVEL_03', sub:'INFILTRATE',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:7},{id:'b',val:191},{id:'c',val:3},{id:'d',val:14},{id:'e',val:'*'},{id:'f',val:'*'},{id:'g',val:190}],
    solution:[[7,'*',191],[3,'*',14]] },
  { id:4, name:'LEVEL_04', sub:'DECRYPT',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:2674},{id:'b',val:2},{id:'c',val:126},{id:'d',val:3},{id:'e',val:'/'},{id:'f',val:'/'},{id:'g',val:'+'},{id:'h',val:4}],
    solution:[[2674,'/',2],[126,'/',3]] },
  { id:5, name:'LEVEL_05', sub:'ROOT_ACCESS',
    equations:[{id:'e0',size:5,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:400},{id:'b',val:3},{id:'c',val:137},{id:'d',val:50},{id:'e',val:8},{id:'f',val:'*'},{id:'g',val:'+'},{id:'h',val:'-'},{id:'i',val:'+'},{id:'j',val:138}],
    solution:[[400,'*',3,'+',137],[50,'-',8]] },
];

const isNumVal = v => typeof v === 'number';
const isNumSlot = i => i % 2 === 0;
function initLevel(lvl) {
  return { eqSlots: lvl.equations.map(eq => Array(eq.size).fill(null)), pool: [...lvl.tiles] };
}
function getLevel(num) { return num <= 5 ? HANDCRAFTED[num-1] : generateLevel(num); }

/* ══════════════════════════════════════════════════════════
   TRANSITION SCREEN
══════════════════════════════════════════════════════════ */
function TransitionScreen({ theme, onDone }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLineIdx(1), 700);
    const t2 = setTimeout(() => setLineIdx(2), 1400);
    const t3 = setTimeout(() => { setDone(true); setTimeout(onDone, 400); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: theme.bg, fontFamily: theme.font,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: done ? 0 : 1, transition: 'opacity 0.4s',
    }}>
      <div style={{ fontSize: 52, color: theme.p, marginBottom: 8,
        textShadow: `0 0 20px ${theme.p}, 0 0 40px ${theme.p}`,
        letterSpacing: 4 }}>
        {theme.name}
      </div>
      <div style={{ fontSize: 28, color: theme.gold, marginBottom: 32,
        textShadow: `0 0 10px ${theme.gold}` }}>
        ERA: {theme.era}
      </div>
      <div style={{ fontSize: 20, color: theme.dim, height: 80, textAlign: 'center' }}>
        {theme.lines.slice(0, lineIdx + 1).map((l, i) => (
          <div key={i} style={{ color: i === lineIdx ? theme.s : theme.dim,
            marginBottom: 4, transition: 'color 0.3s' }}>{l}</div>
        ))}
      </div>
      <div style={{ width: 200, height: 2, background: theme.dim, marginTop: 24, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          background: theme.p,
          width: `${((lineIdx + 1) / theme.lines.length) * 100}%`,
          transition: 'width 0.6s',
          boxShadow: `0 0 8px ${theme.p}`,
        }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const HINT_COOLDOWN = 30;

export default function App() {
  const [levelNum, setLevelNum]   = useState(1);
  const [level, setLevel]         = useState(HANDCRAFTED[0]);
  const [eqSlots, setEqSlots]     = useState(() => initLevel(HANDCRAFTED[0]).eqSlots);
  const [pool, setPool]           = useState(() => initLevel(HANDCRAFTED[0]).pool);
  const [selId, setSelId]         = useState(null);
  const [solved, setSolved]       = useState(false);
  const [shake, setShake]         = useState(null);
  const [blink, setBlink]         = useState(true);
  const [hintActive, setHintActive]     = useState(false);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [cleared, setCleared]     = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [nextLevelNum, setNextLevelNum]     = useState(null);
  const cooldownRef = useRef(null);

  const theme = THEMES[getStageIdx(levelNum)];

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (solved) return;
    const win = level.equations.every((eq, ei) => evalSlots(eqSlots[ei]) === eq.target);
    if (win) { setSolved(true); setCleared(c => c + 1); }
  }, [eqSlots, level, solved]);

  function loadLevel(num) {
    const lvl = getLevel(num);
    setLevel(lvl);
    const { eqSlots: s, pool: p } = initLevel(lvl);
    setEqSlots(s); setPool(p); setSelId(null); setSolved(false); setHintActive(false);
  }

  function clickPool(tile) {
    if (solved) return;
    setSelId(id => id === tile.id ? null : tile.id);
  }

  function clickSlot(ei, si) {
    if (solved) return;
    const cur = eqSlots[ei][si];
    const sel = pool.find(t => t.id === selId);
    const shk = () => { const k=`${ei}-${si}`; setShake(k); setTimeout(()=>setShake(null),420); };
    const ok = tile => isNumSlot(si) ? isNumVal(tile.val) : !isNumVal(tile.val);
    if (!cur && !sel) return;
    if (!cur) {
      if (!sel || !ok(sel)) return shk();
      setPool(p => p.filter(t => t.id !== sel.id));
      setEqSlots(prev => { const n=prev.map(r=>[...r]); n[ei][si]=sel; return n; });
      setSelId(null);
    } else if (!sel) {
      setEqSlots(prev => { const n=prev.map(r=>[...r]); n[ei][si]=null; return n; });
      setPool(p => [...p, cur]); setSelId(cur.id);
    } else {
      if (!ok(sel)) return shk();
      setPool(p => [...p.filter(t => t.id !== sel.id), cur]);
      setEqSlots(prev => { const n=prev.map(r=>[...r]); n[ei][si]=sel; return n; });
      setSelId(null);
    }
  }

  function reset() {
    const { eqSlots: s, pool: p } = initLevel(level);
    setEqSlots(s); setPool(p); setSelId(null); setSolved(false);
  }

  function next() {
    const n = levelNum + 1;
    const curStage = getStageIdx(levelNum);
    const nxtStage = getStageIdx(n);
    if (nxtStage !== curStage) {
      setNextLevelNum(n);
      setShowTransition(true);
    } else {
      setLevelNum(n);
      loadLevel(n);
    }
  }

  function afterTransition() {
    setShowTransition(false);
    setLevelNum(nextLevelNum);
    loadLevel(nextLevelNum);
  }

  function activateHint() {
    if (hintCooldown > 0 || hintActive || solved) return;
    setHintActive(true);
    setTimeout(() => setHintActive(false), 4000);
    setHintCooldown(HINT_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setHintCooldown(c => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c-1; });
    }, 1000);
  }

  const eqVals = eqSlots.map(s => evalSlots(s));
  const eqDone = level.equations.map((eq, ei) => eqVals[ei] === eq.target);
  const selTile = pool.find(t => t.id === selId);
  const T = theme; // shorthand

  // Dynamic CSS for current theme
  const themeCSS = `
    :root {
      --bg: ${T.bg};
      --panel: ${T.panel};
      --p: ${T.p};
      --s: ${T.s};
      --dim: ${T.dim};
      --dimmer: ${T.dimmer};
      --brd: ${T.border};
      --sel: ${T.sel};
      --gold: ${T.gold};
      --err: ${T.err};
      --ok: ${T.ok};
    }
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
    * { box-sizing:border-box; }
    body { background: var(--bg); margin:0; }

    @keyframes glitch {
      0%,84%,100%{text-shadow:0 0 10px var(--p),0 0 20px var(--p);transform:none;filter:none}
      86%{transform:translate(-2px,0) skewX(-2deg);text-shadow:-3px 0 ${T.gc1},3px 0 ${T.gc2};filter:hue-rotate(60deg)}
      88%{transform:translate(2px,0);text-shadow:3px 0 ${T.gc1},-3px 0 ${T.gc2}}
      90%{transform:none;filter:none}
    }
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
      60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
    }
    @keyframes glow {
      0%,100%{box-shadow:0 0 4px var(--p),0 0 8px var(--p)}
      50%{box-shadow:0 0 12px var(--p),0 0 24px var(--p),0 0 36px var(--p)}
    }
    @keyframes goldGlow {
      0%,100%{text-shadow:0 0 8px var(--gold),0 0 16px var(--gold)}
      50%{text-shadow:0 0 20px var(--gold),0 0 40px var(--gold)}
    }
    @keyframes scanAnim { 0%{top:-10%} 100%{top:110%} }
    @keyframes holoShift {
      0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%}
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hintPulse {
      0%,100%{border-bottom-color:var(--gold);opacity:0.6}
      50%{border-bottom-color:var(--gold);opacity:1}
    }

    .tile {
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--brd);padding:6px 14px;cursor:pointer;
      font-size:22px;min-width:56px;background:var(--panel);color:var(--s);
      transition:all 0.12s;letter-spacing:1px;font-family:inherit;
    }
    .tile:hover{border-color:var(--p);color:var(--p);filter:brightness(1.2)}
    .tile.sel{
      border-color:var(--sel);color:var(--sel);
      box-shadow:0 0 8px var(--p);animation:glow 1s infinite;
    }
    .slot {
      display:inline-flex;align-items:center;justify-content:center;
      border-bottom:2px solid var(--brd);padding:4px 8px;
      min-width:56px;min-height:42px;cursor:pointer;
      font-size:22px;transition:all 0.12s;letter-spacing:1px;
    }
    .slot.op{min-width:38px}
    .slot.empty{color:var(--dimmer)}
    .slot.empty:hover{border-bottom-color:var(--p)}
    .slot.filled{color:var(--p);border-bottom-color:var(--s)}
    .slot.filled:hover{border-bottom-color:var(--p)}
    .slot.is-sel{color:var(--sel);border-bottom-color:var(--sel)}
    .slot.done{color:var(--ok);border-bottom-color:var(--ok)}
    .slot.shaking{animation:shake 0.42s}
    .slot.hinting{border-bottom-color:var(--gold);animation:hintPulse 0.7s infinite}
    .eq-box{
      border:1px solid var(--brd);padding:14px 18px;margin:8px 0;
      background:var(--panel);transition:all 0.3s;
    }
    .eq-box.done{border-color:var(--ok);box-shadow:0 0 16px rgba(68,255,120,0.2);background:var(--dimmer)}
    .btn{
      font-family:inherit;background:transparent;border:1px solid;cursor:pointer;
      letter-spacing:2px;transition:all 0.15s;padding:6px 18px;font-size:20px;
    }
    .btn-dim{color:var(--dim);border-color:var(--dim)}
    .btn-dim:hover{color:var(--p);border-color:var(--p)}
    .btn-gold{color:var(--gold);border-color:var(--gold);animation:glow 1s infinite}
    .btn-hint{color:var(--s);border-color:var(--brd)}
    .btn-hint:hover{color:var(--gold);border-color:var(--gold)}
    .btn-hint-off{color:var(--dimmer);border-color:var(--dimmer);cursor:not-allowed}
    .btn-err{color:var(--err);border-color:var(--err)}
    .btn-err:hover{filter:brightness(1.3)}
    .crt-scan{
      position:fixed;left:0;right:0;height:80px;
      background:linear-gradient(transparent,rgba(0,255,65,0.03),transparent);
      pointer-events:none;z-index:9998;animation:scanAnim 7s linear infinite;
    }
    .hint-bar{
      border:1px solid var(--gold);padding:8px 14px;margin-bottom:12px;
      font-size:17px;color:var(--gold);background:rgba(255,215,0,0.05);
      animation:hintPulse 0.7s infinite;
    }
  `;

  // Overlay/bg effect styles based on theme
  const scanLines = T.scanlines ? (
    <div style={{
      position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,
      background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
    }} />
  ) : null;

  const gridOverlay = T.gridLines ? (
    <div style={{
      position:'fixed',inset:0,pointerEvents:'none',zIndex:9997,
      backgroundImage:`linear-gradient(rgba(255,0,255,0.07) 1px, transparent 1px),linear-gradient(90deg,rgba(255,0,255,0.07) 1px,transparent 1px)`,
      backgroundSize:'44px 44px',
    }} />
  ) : null;

  const scanAnim = T.scanlines ? <div className="crt-scan" /> : null;

  const bgStyle = T.holographic
    ? { background:'linear-gradient(-45deg,#000011,#001133,#000033,#002244)', backgroundSize:'400% 400%', animation:'holoShift 10s ease infinite' }
    : { background: T.bg };

  return (
    <div style={{
      fontFamily: T.font,
      color: T.p,
      minHeight: '100vh',
      padding: '16px 20px',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      transition: 'background 1s, color 0.5s',
      ...bgStyle,
    }}>
      <style>{themeCSS}</style>

      {/* Theme-specific overlays */}
      {scanLines}
      {scanAnim}
      {gridOverlay}

      {/* Era transition screen */}
      {showTransition && (
        <TransitionScreen
          theme={THEMES[getStageIdx(nextLevelNum)]}
          onDone={afterTransition}
        />
      )}

      {/* ── TITLE ── */}
      <div style={{ textAlign:'center', marginBottom:12 }}>
        <div style={{ fontSize:52, animation:'glitch 5s infinite', letterSpacing:4, lineHeight:1 }}>
          1337<span style={{ color:T.dim }}>/</span>42
        </div>
        <div style={{ fontSize:17, color:T.dim, letterSpacing:7, marginTop:2 }}>
          MATHEMATICAL EXPLOIT PUZZLE
        </div>
        <div style={{ fontSize:15, color:T.s, marginTop:4, letterSpacing:4 }}>
          ◈ {T.name} ◈ {T.era} ◈
        </div>
      </div>

      {/* ── LEVEL BAR ── */}
      <div style={{
        borderTop:`1px solid ${T.dim}`, borderBottom:`1px solid ${T.dim}`,
        padding:'7px 0', marginBottom:14,
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
      }}>
        <div>
          <span style={{ color:T.s, fontSize:22 }}>{level.name}</span>
          <span style={{ color:T.dim, fontSize:22 }}> :: {level.sub}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:16, color:T.dim }}>
          STAGE {getStageIdx(levelNum)+1}/6
          <span style={{ color:T.s, marginLeft:8 }}>CLR:{cleared}</span>
          {levelNum <= 5 && (
            <div style={{ display:'flex', gap:3, marginLeft:8 }}>
              {HANDCRAFTED.map((_,i) => (
                <span key={i} style={{
                  display:'inline-block', width:10, height:10, borderRadius:'50%',
                  background: i < levelNum-1 ? T.p : i===levelNum-1 ? T.s : T.dimmer,
                  boxShadow: i === levelNum-1 ? `0 0 6px ${T.p}` : 'none',
                  transition:'background 0.3s',
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── HINT BANNER ── */}
      {hintActive && (
        <div className="hint-bar">
          ⚡ HINT :: {level.equations.map((eq, ei) => (
            <span key={ei} style={{ marginRight:20 }}>
              {level.solution[ei].map(String).join(' ')} = {eq.target}
            </span>
          ))}
        </div>
      )}

      {/* ── EQUATIONS ── */}
      <div style={{ marginBottom:16 }}>
        {level.equations.map((eq, ei) => {
          const val = eqVals[ei];
          const done = eqDone[ei];
          return (
            <div key={eq.id} className={`eq-box${done?' done':''}`}>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                {eqSlots[ei].map((slot, si) => {
                  const isOp = !isNumSlot(si);
                  const k = `${ei}-${si}`;
                  const isSel = slot && slot.id === selId;
                  const isHintEmpty = hintActive && !slot;
                  let cls = `slot${isOp?' op':''}`;
                  if (!slot) cls += ' empty'; else if (isSel) cls += ' is-sel'; else if (done) cls += ' done'; else cls += ' filled';
                  if (shake === k) cls += ' shaking';
                  if (isHintEmpty) cls += ' hinting';
                  const hv = isHintEmpty && level.solution?.[ei]?.[si];
                  return (
                    <span key={si} className={cls} onClick={() => clickSlot(ei, si)}>
                      {slot ? String(slot.val)
                        : hv !== undefined && hv !== false
                          ? <span style={{ color:T.gold, opacity:0.7 }}>{String(hv)}</span>
                          : (isOp ? '○' : '___')
                      }
                    </span>
                  );
                })}
                <span style={{ fontSize:26, color:T.dim, margin:'0 4px' }}>=</span>
                <span style={{ fontSize:30, minWidth:52, color:done?T.ok:T.p, textShadow:done?`0 0 10px ${T.ok}`:undefined }}>
                  {eq.target}
                </span>
                <span style={{ marginLeft:'auto', fontSize:18 }}>
                  {done
                    ? <span style={{ color:T.ok, animation:'glow 1s infinite' }}>✓ MATCH</span>
                    : val !== null
                      ? <span style={{ color:T.dim }}>= {val}</span>
                      : <span style={{ color:T.dimmer }}>?</span>
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TILE POOL ── */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:16, color:T.dim, marginBottom:8, letterSpacing:2 }}>
          {'// TILE_POOL :: '}
          {selTile
            ? <span style={{ color:T.sel }}>SELECTED: {String(selTile.val)}</span>
            : 'SELECT A TILE'
          }
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', minHeight:54, alignItems:'center' }}>
          {pool.map(tile => (
            <span key={tile.id} className={`tile${selId===tile.id?' sel':''}`} onClick={() => clickPool(tile)}>
              {String(tile.val)}
            </span>
          ))}
          {pool.length === 0 && <span style={{ color:T.dim, fontSize:18 }}>[ ALL_TILES_PLACED ]</span>}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <button className="btn btn-dim" onClick={reset}>[RESET]</button>
        {selId && <button className="btn btn-err" onClick={() => setSelId(null)}>[DESELECT]</button>}
        {!solved && (
          <button
            className={`btn ${hintActive?'btn-gold':hintCooldown>0?'btn-hint-off':'btn-hint'}`}
            onClick={activateHint}
          >
            {hintActive?'[HINT ON]':hintCooldown>0?`[HINT ${hintCooldown}s]`:'[HINT]'}
          </button>
        )}
        {solved && (
          <>
            <button className="btn btn-gold" onClick={next} style={{ fontSize:22 }}>
              {getStageIdx(levelNum+1) !== getStageIdx(levelNum)
                ? `[ENTER ${THEMES[getStageIdx(levelNum+1)].era} >>]`
                : '[NEXT LEVEL >>]'
              }
            </button>
            <span style={{ color:T.gold, fontSize:22, animation:'goldGlow 1.5s infinite' }}>
              ⚡ ACCESS GRANTED
            </span>
          </>
        )}
      </div>

      {/* ── INSTRUCTIONS (early levels) ── */}
      {!solved && levelNum <= 2 && (
        <div style={{ marginTop:14, fontSize:15, color:T.dimmer, borderTop:`1px solid ${T.dimmer}`, paddingTop:10, lineHeight:1.7 }}>
          {'>'} Click tile → SELECT &nbsp;|&nbsp; Empty slot → PLACE &nbsp;|&nbsp; Filled slot → PICK UP &nbsp;|&nbsp; Filled+holding → SWAP
        </div>
      )}

      {/* ── CURSOR ── */}
      <div style={{ marginTop:14, fontSize:18, color:T.dim }}>
        {'> '}<span style={{ opacity:blink?1:0 }}>█</span>
      </div>
    </div>
  );
}
