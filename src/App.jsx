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
  for (let i = 2; i <= Math.sqrt(n); i++)
    if (n % i === 0) f.push([i, n / i]);
  return f;
}

/* ══════════════════════════════════════════════════════════
   EQUATION GENERATORS
══════════════════════════════════════════════════════════ */
let uid = 1000;

function makeEq3(target, ops) {
  for (const op of shuffle([...ops])) {
    for (let t = 0; t < 20; t++) {
      if (op === '+') {
        const a = randInt(1, target - 1);
        return [a, '+', target - a];
      }
      if (op === '-') {
        const b = randInt(1, Math.min(target, 500));
        return [target + b, '-', b];
      }
      if (op === '*') {
        const f = getFactors(target);
        if (!f.length) continue;
        const [a, b] = randFrom(f);
        return [a, '*', b];
      }
      if (op === '/') {
        const b = randInt(2, 15);
        return [target * b, '/', b];
      }
    }
  }
  return [target - 1, '+', 1]; // absolute fallback
}

function makeEq5(target, ops) {
  for (let t = 0; t < 150; t++) {
    const op1 = randFrom(ops), op2 = randFrom(ops);
    const a = randInt(2, 40), b = randInt(2, 20);
    let inter;
    if (op1 === '+') inter = a + b;
    else if (op1 === '-') { if (a <= b) continue; inter = a - b; }
    else if (op1 === '*') inter = a * b;
    else if (op1 === '/') { if (!b || a % b !== 0) continue; inter = a / b; }
    if (!inter || inter <= 0) continue;
    let c;
    if (op2 === '+') c = target - inter;
    else if (op2 === '-') c = inter - target;
    else if (op2 === '*') { if (!inter || target % inter !== 0) continue; c = target / inter; }
    else if (op2 === '/') { if (!target || inter % target !== 0) continue; c = inter / target; }
    if (!Number.isInteger(c) || c <= 0) continue;
    return [a, op1, b, op2, c];
  }
  return null;
}

function makeDecoys(count, ops, solVals) {
  const nums = solVals.filter(v => typeof v === 'number');
  const decoys = [];
  for (let i = 0; i < count; i++) {
    // Alternate between operator and number decoys, bias toward misleading numbers
    if (i % 3 === 0) {
      decoys.push(randFrom(ops));
    } else {
      const base = nums.length ? randFrom(nums) : randInt(1, 100);
      const spread = Math.max(2, Math.floor(base * 0.12));
      const sign = Math.random() > 0.5 ? 1 : -1;
      const d = Math.max(1, base + sign * randInt(1, spread));
      decoys.push(d);
    }
  }
  return decoys;
}

const DIFF_NAMES = [
  'EASY', 'EASY', 'NORMAL', 'NORMAL', 'HARD',
  'HARD', 'EXPERT', 'EXPERT', 'ELITE', 'ELITE', 'GODMODE'
];

function generateLevel(levelNum) {
  const step = levelNum - 5; // 1 for level 6, 2 for level 7, ...
  const ops =
    step <= 2  ? ['+'] :
    step <= 5  ? ['+', '-'] :
    step <= 10 ? ['+', '-', '*'] :
                 ['+', '-', '*', '/'];

  const use5Slot = step > 8 && Math.random() > 0.35;
  const numDecoys = Math.min(1 + Math.floor(step / 2), 7);

  let eq1Vals = use5Slot ? makeEq5(1337, ops) : null;
  if (!eq1Vals) eq1Vals = makeEq3(1337, ops);
  const eq2Vals = makeEq3(42, ops);

  const solVals = [...eq1Vals, ...eq2Vals];
  const decoys = makeDecoys(numDecoys, ops, solVals);

  const allTiles = shuffle([...solVals, ...decoys])
    .map(val => ({ id: `g${uid++}`, val }));

  const diffIdx = Math.min(step - 1, DIFF_NAMES.length - 1);

  return {
    id: levelNum,
    name: `LEVEL_${String(levelNum).padStart(2, '0')}`,
    sub: DIFF_NAMES[diffIdx],
    equations: [
      { id: 'e0', size: eq1Vals.length, target: 1337 },
      { id: 'e1', size: eq2Vals.length, target: 42 },
    ],
    tiles: allTiles,
    solution: [eq1Vals, eq2Vals],
  };
}

/* ══════════════════════════════════════════════════════════
   HANDCRAFTED LEVELS 1–5
   Solutions verified:
     L1: 1000+337=1337, 40+2=42
     L2: 1330+7=1337,   84/2=42
     L3: 7*191=1337,    3*14=42    (decoy: 190)
     L4: 2674/2=1337,   126/3=42  (decoys: +, 4)
     L5: 400*3+137=1337, 50-8=42  (decoys: +, 138)
══════════════════════════════════════════════════════════ */
const HANDCRAFTED = [
  {
    id: 1, name: 'LEVEL_01', sub: 'INITIATION',
    equations: [{ id: 'e0', size: 3, target: 1337 }, { id: 'e1', size: 3, target: 42 }],
    tiles: [
      { id: 'a', val: 1000 }, { id: 'b', val: 337 },
      { id: 'c', val: 40 },   { id: 'd', val: 2 },
      { id: 'e', val: '+' },  { id: 'f', val: '+' },
    ],
    solution: [[1000, '+', 337], [40, '+', 2]],
  },
  {
    id: 2, name: 'LEVEL_02', sub: 'BYPASS',
    equations: [{ id: 'e0', size: 3, target: 1337 }, { id: 'e1', size: 3, target: 42 }],
    tiles: [
      { id: 'a', val: 1330 }, { id: 'b', val: 7 },
      { id: 'c', val: 84 },   { id: 'd', val: 2 },
      { id: 'e', val: '+' },  { id: 'f', val: '/' },
      { id: 'g', val: '+' }, // decoy op
    ],
    solution: [[1330, '+', 7], [84, '/', 2]],
  },
  {
    id: 3, name: 'LEVEL_03', sub: 'INFILTRATE',
    equations: [{ id: 'e0', size: 3, target: 1337 }, { id: 'e1', size: 3, target: 42 }],
    tiles: [
      { id: 'a', val: 7 },   { id: 'b', val: 191 },
      { id: 'c', val: 3 },   { id: 'd', val: 14 },
      { id: 'e', val: '*' }, { id: 'f', val: '*' },
      { id: 'g', val: 190 }, // decoy number (close to 191!)
    ],
    solution: [[7, '*', 191], [3, '*', 14]],
  },
  {
    id: 4, name: 'LEVEL_04', sub: 'DECRYPT',
    equations: [{ id: 'e0', size: 3, target: 1337 }, { id: 'e1', size: 3, target: 42 }],
    tiles: [
      { id: 'a', val: 2674 }, { id: 'b', val: 2 },
      { id: 'c', val: 126 },  { id: 'd', val: 3 },
      { id: 'e', val: '/' },  { id: 'f', val: '/' },
      { id: 'g', val: '+' },  // decoy op
      { id: 'h', val: 4 },    // decoy number
    ],
    solution: [[2674, '/', 2], [126, '/', 3]],
  },
  {
    id: 5, name: 'LEVEL_05', sub: 'ROOT_ACCESS',
    equations: [{ id: 'e0', size: 5, target: 1337 }, { id: 'e1', size: 3, target: 42 }],
    tiles: [
      { id: 'a', val: 400 }, { id: 'b', val: 3 },   { id: 'c', val: 137 },
      { id: 'd', val: 50 },  { id: 'e', val: 8 },
      { id: 'f', val: '*' }, { id: 'g', val: '+' }, { id: 'h', val: '-' },
      { id: 'i', val: '+' }, // decoy op
      { id: 'j', val: 138 }, // decoy number (close to 137!)
    ],
    solution: [[400, '*', 3, '+', 137], [50, '-', 8]],
  },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const isNumVal = v => typeof v === 'number';
const isNumSlot = i => i % 2 === 0;

function initLevel(lvl) {
  return {
    eqSlots: lvl.equations.map(eq => Array(eq.size).fill(null)),
    pool: [...lvl.tiles],
  };
}

function getLevel(num) {
  return num <= 5 ? HANDCRAFTED[num - 1] : generateLevel(num);
}

const HINT_DURATION = 4000;
const HINT_COOLDOWN = 30;

/* ══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
export default function App() {
  const [levelNum, setLevelNum]   = useState(1);
  const [level, setLevel]         = useState(HANDCRAFTED[0]);
  const [eqSlots, setEqSlots]     = useState(() => initLevel(HANDCRAFTED[0]).eqSlots);
  const [pool, setPool]           = useState(() => initLevel(HANDCRAFTED[0]).pool);
  const [selId, setSelId]         = useState(null);
  const [solved, setSolved]       = useState(false);
  const [gameWon, setGameWon]     = useState(false);
  const [shake, setShake]         = useState(null);
  const [blink, setBlink]         = useState(true);
  const [hintActive, setHintActive]     = useState(false);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const cooldownRef = useRef(null);

  // Cursor blink
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  // Win detection
  useEffect(() => {
    if (solved) return;
    const win = level.equations.every((eq, ei) => evalSlots(eqSlots[ei]) === eq.target);
    if (win) { setSolved(true); setClearedCount(c => c + 1); }
  }, [eqSlots, level, solved]);

  function loadLevel(num) {
    const lvl = getLevel(num);
    setLevel(lvl);
    const { eqSlots: s, pool: p } = initLevel(lvl);
    setEqSlots(s);
    setPool(p);
    setSelId(null);
    setSolved(false);
    setHintActive(false);
  }

  function clickPool(tile) {
    if (solved) return;
    setSelId(id => id === tile.id ? null : tile.id);
  }

  function clickSlot(ei, si) {
    if (solved) return;
    const cur = eqSlots[ei][si];
    const sel = pool.find(t => t.id === selId);
    const shk = () => {
      const k = `${ei}-${si}`;
      setShake(k);
      setTimeout(() => setShake(null), 420);
    };
    const compat = tile => isNumSlot(si) ? isNumVal(tile.val) : !isNumVal(tile.val);

    if (!cur && !sel) return;

    if (!cur) {
      if (!sel) return;
      if (!compat(sel)) return shk();
      setPool(p => p.filter(t => t.id !== sel.id));
      setEqSlots(prev => { const n = prev.map(r => [...r]); n[ei][si] = sel; return n; });
      setSelId(null);
    } else if (!sel) {
      setEqSlots(prev => { const n = prev.map(r => [...r]); n[ei][si] = null; return n; });
      setPool(p => [...p, cur]);
      setSelId(cur.id);
    } else {
      if (!compat(sel)) return shk();
      setPool(p => [...p.filter(t => t.id !== sel.id), cur]);
      setEqSlots(prev => { const n = prev.map(r => [...r]); n[ei][si] = sel; return n; });
      setSelId(null);
    }
  }

  function reset() {
    const { eqSlots: s, pool: p } = initLevel(level);
    setEqSlots(s); setPool(p); setSelId(null); setSolved(false);
  }

  function next() {
    const n = levelNum + 1;
    setLevelNum(n);
    loadLevel(n);
  }

  function activateHint() {
    if (hintCooldown > 0 || hintActive || solved) return;
    setHintActive(true);
    setTimeout(() => setHintActive(false), HINT_DURATION);
    setHintCooldown(HINT_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setHintCooldown(c => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  const eqVals = eqSlots.map(s => evalSlots(s));
  const eqDone = level.equations.map((eq, ei) => eqVals[ei] === eq.target);
  const selTile = pool.find(t => t.id === selId);
  const isGenerated = levelNum > 5;

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <div style={{
      fontFamily: "'VT323','Courier New',monospace",
      background: '#050e06', color: '#00ff41',
      minHeight: '100vh', padding: '16px 20px',
      userSelect: 'none', position: 'relative',
      overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        * { box-sizing: border-box; }

        @keyframes glitch {
          0%,84%,100%{text-shadow:0 0 10px #00ff41,0 0 20px #00ff41;transform:none;filter:none}
          86%{transform:translate(-2px,0) skewX(-2deg);text-shadow:-3px 0 #ff00ff,3px 0 #00ffff;filter:hue-rotate(90deg)}
          88%{transform:translate(2px,0);text-shadow:3px 0 #ff00ff,-3px 0 #00ffff}
          90%{transform:none;filter:none}
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        @keyframes glow {
          0%,100%{box-shadow:0 0 4px #00ff41,0 0 8px #00ff41}
          50%{box-shadow:0 0 12px #00ff41,0 0 24px #00ff41,0 0 36px #00ff41}
        }
        @keyframes goldPulse {
          0%,100%{text-shadow:0 0 8px #ffd700,0 0 16px #ffd700}
          50%{text-shadow:0 0 20px #ffd700,0 0 40px #ffd700,0 0 60px #ffaa00}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes scanAnim { 0%{top:-10%} 100%{top:110%} }
        @keyframes hintPulse {
          0%,100%{background:rgba(255,215,0,0.08);border-color:#ffd700}
          50%{background:rgba(255,215,0,0.18);border-color:#ffee88}
        }

        .tile {
          display:inline-flex; align-items:center; justify-content:center;
          border:1px solid #005522; padding:6px 14px; cursor:pointer;
          font-size:22px; min-width:56px; background:#010d03; color:#00cc33;
          transition:all 0.12s; letter-spacing:1px;
        }
        .tile:hover{border-color:#00ff41;color:#00ff41;background:#001a0a}
        .tile.sel{
          border-color:#80ffaa;color:#80ffaa;background:#002a12;
          box-shadow:0 0 8px #00ff41;animation:glow 1s infinite;
        }
        .slot {
          display:inline-flex; align-items:center; justify-content:center;
          border-bottom:2px solid #004418; padding:4px 8px;
          min-width:56px; min-height:42px; cursor:pointer;
          font-size:22px; transition:all 0.12s; letter-spacing:1px;
          position:relative;
        }
        .slot.op{min-width:38px}
        .slot.empty{color:#002a10}
        .slot.empty:hover{border-bottom-color:#00ff41}
        .slot.filled{color:#00ee33;border-bottom-color:#00aa22}
        .slot.filled:hover{border-bottom-color:#00ff41}
        .slot.is-sel{color:#80ffaa;border-bottom-color:#80ffaa}
        .slot.done{color:#44ff99;border-bottom-color:#44ff99}
        .slot.shaking{animation:shake 0.42s}
        .slot.hint-slot{
          border-bottom-color:#ffd700;
          animation:hintPulse 0.8s infinite;
        }
        .eq-box{
          border:1px solid #004418;padding:14px 18px;margin:8px 0;
          background:#010d03;transition:all 0.3s;
        }
        .eq-box.done{
          border-color:#44ff99;
          box-shadow:0 0 16px rgba(68,255,120,0.25);
          background:#011408;
        }
        .btn{
          font-family:'VT323','Courier New',monospace;
          background:transparent;border:1px solid;cursor:pointer;
          letter-spacing:2px;transition:all 0.15s;
          padding:6px 18px;font-size:20px;
        }
        .btn-green{color:#005522;border-color:#005522}
        .btn-green:hover{color:#00ff41;border-color:#00ff41}
        .btn-gold{color:#ffd700;border-color:#ffd700;animation:glow 1s infinite}
        .btn-hint{color:#aa8800;border-color:#aa8800}
        .btn-hint:hover{color:#ffd700;border-color:#ffd700}
        .btn-hint-disabled{color:#333;border-color:#333;cursor:not-allowed}
        .btn-red{color:#ff4444;border-color:#ff4444}
        .btn-red:hover{color:#ff8888;border-color:#ff8888}
        .crt-lines{
          position:fixed;top:0;left:0;right:0;bottom:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px);
          pointer-events:none;z-index:9999;
        }
        .crt-scan{
          position:fixed;left:0;right:0;height:80px;
          background:linear-gradient(transparent,rgba(0,255,65,0.03),transparent);
          pointer-events:none;z-index:9998;
          animation:scanAnim 7s linear infinite;
        }
        .hint-banner{
          background:rgba(255,215,0,0.06);border:1px solid #aa8800;
          padding:8px 14px;margin-bottom:12px;font-size:17px;color:#ffd700;
          animation:hintPulse 0.8s infinite;
        }
      `}</style>

      <div className="crt-lines" />
      <div className="crt-scan" />

      {/* ── WIN SCREEN ───────────────────────────────────── */}
      {gameWon ? (
        <div style={{ textAlign: 'center', paddingTop: '10vh', animation: 'fadeUp 0.6s' }}>
          <div style={{ fontSize: 60, color: '#ffd700', animation: 'goldPulse 1.5s infinite', marginBottom: 12 }}>
            ROOT ACCESS<br />GRANTED
          </div>
          <div style={{ fontSize: 24, color: '#00ff41', marginBottom: 6 }}>SYSTEM FULLY COMPROMISED</div>
          <div style={{ fontSize: 20, color: '#005522', marginBottom: 40 }}>
            Levels cleared: <span style={{ color: '#ffd700' }}>{clearedCount}</span>
          </div>
          <button className="btn btn-gold" onClick={() => { setLevelNum(1); loadLevel(1); setGameWon(false); setClearedCount(0); }} style={{ fontSize: 24, padding: '10px 30px' }}>
            [RESTART PROTOCOL]
          </button>
        </div>
      ) : (
        <>
          {/* ── TITLE ───────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 52, animation: 'glitch 5s infinite', letterSpacing: 4, lineHeight: 1 }}>
              1337<span style={{ color: '#005522' }}>/</span>42
            </div>
            <div style={{ fontSize: 17, color: '#005522', letterSpacing: 7, marginTop: 2 }}>
              MATHEMATICAL EXPLOIT PUZZLE
            </div>
          </div>

          {/* ── LEVEL BAR ───────────────────────────────── */}
          <div style={{
            borderTop: '1px solid #003311', borderBottom: '1px solid #003311',
            padding: '7px 0', marginBottom: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            <div>
              <span style={{ color: '#00aa22', fontSize: 22 }}>{level.name}</span>
              <span style={{ color: '#005522', fontSize: 22 }}> :: {level.sub}</span>
              {isGenerated && (
                <span style={{ color: '#003311', fontSize: 16, marginLeft: 10 }}>∞ GENERATED</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, color: '#004418' }}>
                CLEARED: <span style={{ color: '#00aa22' }}>{clearedCount}</span>
              </span>
              {!isGenerated && (
                <div style={{ display: 'flex', gap: 3, marginLeft: 8 }}>
                  {HANDCRAFTED.map((_, i) => (
                    <span key={i} style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: i < levelNum - 1 ? '#00ff41' : i === levelNum - 1 ? '#00aa22' : '#002210',
                    }} />
                  ))}
                  <span style={{ color: '#003311', fontSize: 14, marginLeft: 4 }}>∞</span>
                </div>
              )}
            </div>
          </div>

          {/* ── HINT BANNER ─────────────────────────────── */}
          {hintActive && (
            <div className="hint-banner">
              ⚡ HINT :: {level.equations.map((eq, ei) => (
                <span key={ei} style={{ marginRight: 20 }}>
                  {level.solution[ei].map(String).join(' ')} = {eq.target}
                </span>
              ))}
            </div>
          )}

          {/* ── EQUATIONS ───────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            {level.equations.map((eq, ei) => {
              const val = eqVals[ei];
              const done = eqDone[ei];
              return (
                <div key={eq.id} className={`eq-box${done ? ' done' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {eqSlots[ei].map((slot, si) => {
                      const isOp = !isNumSlot(si);
                      const k = `${ei}-${si}`;
                      const isSel = slot && slot.id === selId;
                      const isHintSlot = hintActive && !slot;
                      let cls = `slot${isOp ? ' op' : ''}`;
                      if (!slot) cls += ' empty';
                      else if (isSel) cls += ' is-sel';
                      else if (done) cls += ' done';
                      else cls += ' filled';
                      if (shake === k) cls += ' shaking';
                      if (isHintSlot) cls += ' hint-slot';

                      const hintVal = isHintSlot && level.solution?.[ei]?.[si];

                      return (
                        <span key={si} className={cls} onClick={() => clickSlot(ei, si)}>
                          {slot
                            ? String(slot.val)
                            : hintVal !== undefined && hintVal !== false
                              ? <span style={{ color: '#ffd700', opacity: 0.7 }}>{String(hintVal)}</span>
                              : (isOp ? '○' : '___')
                          }
                        </span>
                      );
                    })}

                    <span style={{ fontSize: 26, color: '#004418', margin: '0 4px' }}>=</span>

                    <span style={{
                      fontSize: 30, minWidth: 52,
                      color: done ? '#44ff99' : '#00ff41',
                      textShadow: done ? '0 0 10px #44ff99' : undefined,
                    }}>
                      {eq.target}
                    </span>

                    <span style={{ marginLeft: 'auto', fontSize: 18 }}>
                      {done
                        ? <span style={{ color: '#44ff99', animation: 'glow 1s infinite' }}>✓ MATCH</span>
                        : val !== null
                          ? <span style={{ color: '#004418' }}>= {val}</span>
                          : <span style={{ color: '#002a10' }}>?</span>
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── TILE POOL ───────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, color: '#004418', marginBottom: 8, letterSpacing: 2 }}>
              {'// TILE_POOL :: '}
              {selTile
                ? <span style={{ color: '#80ffaa' }}>SELECTED: {String(selTile.val)}</span>
                : 'SELECT A TILE'
              }
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minHeight: 54, alignItems: 'center' }}>
              {pool.map(tile => (
                <span
                  key={tile.id}
                  className={`tile${selId === tile.id ? ' sel' : ''}`}
                  onClick={() => clickPool(tile)}
                >
                  {String(tile.val)}
                </span>
              ))}
              {pool.length === 0 && (
                <span style={{ color: '#003311', fontSize: 18 }}>[ ALL_TILES_PLACED ]</span>
              )}
            </div>
          </div>

          {/* ── CONTROLS ────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-green" onClick={reset}>[RESET]</button>

            {selId && (
              <button className="btn btn-red" onClick={() => setSelId(null)}>[DESELECT]</button>
            )}

            {/* HINT */}
            {!solved && (
              <button
                className={`btn ${hintActive ? 'btn-gold' : hintCooldown > 0 ? 'btn-hint-disabled' : 'btn-hint'}`}
                onClick={activateHint}
                title={hintCooldown > 0 ? `Cooldown: ${hintCooldown}s` : 'Show solution hint for 4 seconds'}
              >
                {hintActive
                  ? '[HINT ACTIVE]'
                  : hintCooldown > 0
                    ? `[HINT ${hintCooldown}s]`
                    : '[HINT]'
                }
              </button>
            )}

            {solved && (
              <>
                <button className="btn btn-gold" onClick={next} style={{ fontSize: 22 }}>
                  [NEXT LEVEL >>]
                </button>
                <span style={{ color: '#ffd700', fontSize: 22, animation: 'goldPulse 1.5s infinite' }}>
                  ⚡ ACCESS GRANTED
                </span>
              </>
            )}
          </div>

          {/* ── DIFFICULTY INFO (generated levels) ──────── */}
          {isGenerated && (
            <div style={{ marginTop: 14, fontSize: 15, color: '#003a11', borderTop: '1px solid #002208', paddingTop: 10 }}>
              {'>'} Level {levelNum - 5} generated &nbsp;|&nbsp;
              Ops: {
                levelNum - 5 <= 2  ? '[+]' :
                levelNum - 5 <= 5  ? '[+ -]' :
                levelNum - 5 <= 10 ? '[+ - *]' :
                                     '[+ - * /]'
              }
              &nbsp;|&nbsp;
              Decoys: {Math.min(1 + Math.floor((levelNum - 5) / 2), 7)}
              &nbsp;|&nbsp;
              5-slot: {levelNum - 5 > 8 ? 'possible' : 'no'}
            </div>
          )}

          {/* ── INSTRUCTIONS (early levels) ─────────────── */}
          {!solved && levelNum <= 2 && (
            <div style={{ marginTop: 14, fontSize: 15, color: '#003311', borderTop: '1px solid #002208', paddingTop: 10, lineHeight: 1.7 }}>
              {'>'} Click tile → SELECT &nbsp;|&nbsp; Click empty slot → PLACE &nbsp;|&nbsp; Click filled slot → PICK UP<br />
              {'>'} Click occupied slot while holding → SWAP &nbsp;|&nbsp; Even slots = numbers, odd slots = operators
            </div>
          )}

          {/* ── CURSOR ──────────────────────────────────── */}
          <div style={{ marginTop: 14, fontSize: 18, color: '#003311' }}>
            {'>'} <span style={{ opacity: blink ? 1 : 0 }}>█</span>
          </div>
        </>
      )}
    </div>
  );
}
