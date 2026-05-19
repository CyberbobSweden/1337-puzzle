import { useState, useEffect } from "react";

/* ─── LEVELS ──────────────────────────────────────────────────────────────
   Solutions:
     L1: 1000+337=1337,  40+3=43
     L2: 1330+7=1337,    86/2=43
     L3: 7*191=1337,     43*1=43
     L4: 2674/2=1337,   172/4=43
     L5: 400*3+137=1337, 50-7=43   (+ extra decoy op tile)
   ─────────────────────────────────────────────────────────────────────── */
const LEVELS = [
  {
    id: 1, name: "LEVEL_01", sub: "INITIATION",
    equations: [
      { id: "e0", size: 3, target: 1337 },
      { id: "e1", size: 3, target: 43 },
    ],
    tiles: [
      { id: "a", val: 1000 }, { id: "b", val: 337 },
      { id: "c", val: 40 },   { id: "d", val: 3 },
      { id: "e", val: "+" },  { id: "f", val: "+" },
    ],
  },
  {
    id: 2, name: "LEVEL_02", sub: "BYPASS",
    equations: [
      { id: "e0", size: 3, target: 1337 },
      { id: "e1", size: 3, target: 43 },
    ],
    tiles: [
      { id: "a", val: 1330 }, { id: "b", val: 7 },
      { id: "c", val: 86 },   { id: "d", val: 2 },
      { id: "e", val: "+" },  { id: "f", val: "/" },
    ],
  },
  {
    id: 3, name: "LEVEL_03", sub: "INFILTRATE",
    equations: [
      { id: "e0", size: 3, target: 1337 },
      { id: "e1", size: 3, target: 43 },
    ],
    tiles: [
      { id: "a", val: 7 },   { id: "b", val: 191 },
      { id: "c", val: 43 },  { id: "d", val: 1 },
      { id: "e", val: "*" }, { id: "f", val: "*" },
    ],
  },
  {
    id: 4, name: "LEVEL_04", sub: "DECRYPT",
    equations: [
      { id: "e0", size: 3, target: 1337 },
      { id: "e1", size: 3, target: 43 },
    ],
    tiles: [
      { id: "a", val: 2674 }, { id: "b", val: 2 },
      { id: "c", val: 172 },  { id: "d", val: 4 },
      { id: "e", val: "/" },  { id: "f", val: "/" },
    ],
  },
  {
    id: 5, name: "LEVEL_05", sub: "ROOT_ACCESS",
    equations: [
      { id: "e0", size: 5, target: 1337 },
      { id: "e1", size: 3, target: 43 },
    ],
    tiles: [
      { id: "a", val: 400 }, { id: "b", val: 3 },
      { id: "c", val: 137 }, { id: "d", val: 50 },
      { id: "e", val: 7 },
      { id: "f", val: "*" }, { id: "g", val: "+" },
      { id: "h", val: "-" }, { id: "i", val: "+" }, // extra decoy
    ],
  },
];

/* ─── HELPERS ───────────────────────────────────────────────────────────── */
function evalSlots(slots) {
  if (!slots || slots.some((s) => s === null)) return null;
  let r = slots[0].val;
  for (let i = 1; i < slots.length; i += 2) {
    const op = slots[i].val;
    const n = slots[i + 1].val;
    if (op === "+") r += n;
    else if (op === "-") r -= n;
    else if (op === "*") r *= n;
    else if (op === "/") {
      if (n === 0) return NaN;
      r /= n;
    }
  }
  return r;
}

function initLevel(idx) {
  const lvl = LEVELS[idx];
  return {
    eqSlots: lvl.equations.map((eq) => Array(eq.size).fill(null)),
    pool: [...lvl.tiles],
  };
}

const isNumVal = (v) => typeof v === "number";
const isNumSlot = (i) => i % 2 === 0;

/* ─── COMPONENT ─────────────────────────────────────────────────────────── */
export default function App() {
  const [li, setLi] = useState(0);
  const [eqSlots, setEqSlots] = useState(() => initLevel(0).eqSlots);
  const [pool, setPool] = useState(() => initLevel(0).pool);
  const [selId, setSelId] = useState(null);
  const [solved, setSolved] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [shake, setShake] = useState(null);
  const [blink, setBlink] = useState(true);

  const lvl = LEVELS[li];

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (solved) return;
    const win = lvl.equations.every(
      (eq, ei) => evalSlots(eqSlots[ei]) === eq.target
    );
    if (win) setSolved(true);
  }, [eqSlots, lvl, solved]);

  function clickPool(tile) {
    if (solved) return;
    setSelId((id) => (id === tile.id ? null : tile.id));
  }

  function clickSlot(ei, si) {
    if (solved) return;
    const cur = eqSlots[ei][si];
    const sel = pool.find((t) => t.id === selId);

    const shakeSlot = () => {
      const k = `${ei}-${si}`;
      setShake(k);
      setTimeout(() => setShake(null), 420);
    };

    const compat = (tile) =>
      isNumSlot(si) ? isNumVal(tile.val) : !isNumVal(tile.val);

    if (!cur && !sel) return;

    if (!cur) {
      if (!sel) return;
      if (!compat(sel)) return shakeSlot();
      setPool((p) => p.filter((t) => t.id !== sel.id));
      setEqSlots((prev) => {
        const n = prev.map((r) => [...r]);
        n[ei][si] = sel;
        return n;
      });
      setSelId(null);
    } else if (!sel) {
      setEqSlots((prev) => {
        const n = prev.map((r) => [...r]);
        n[ei][si] = null;
        return n;
      });
      setPool((p) => [...p, cur]);
      setSelId(cur.id);
    } else {
      if (!compat(sel)) return shakeSlot();
      setPool((p) => [...p.filter((t) => t.id !== sel.id), cur]);
      setEqSlots((prev) => {
        const n = prev.map((r) => [...r]);
        n[ei][si] = sel;
        return n;
      });
      setSelId(null);
    }
  }

  function reset() {
    const { eqSlots: s, pool: p } = initLevel(li);
    setEqSlots(s);
    setPool(p);
    setSelId(null);
    setSolved(false);
  }

  function nextLevel() {
    if (li + 1 >= LEVELS.length) {
      setGameWon(true);
      return;
    }
    const ni = li + 1;
    const { eqSlots: s, pool: p } = initLevel(ni);
    setLi(ni);
    setEqSlots(s);
    setPool(p);
    setSelId(null);
    setSolved(false);
  }

  function restartGame() {
    const { eqSlots: s, pool: p } = initLevel(0);
    setLi(0);
    setEqSlots(s);
    setPool(p);
    setSelId(null);
    setSolved(false);
    setGameWon(false);
  }

  const eqVals = eqSlots.map((s) => evalSlots(s));
  const eqDone = lvl.equations.map((eq, ei) => eqVals[ei] === eq.target);
  const selTile = pool.find((t) => t.id === selId);

  return (
    <div
      style={{
        fontFamily: "'VT323','Courier New',monospace",
        background: "#050e06",
        color: "#00ff41",
        minHeight: "100vh",
        padding: "16px 20px",
        userSelect: "none",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        * { box-sizing: border-box; }

        @keyframes glitch {
          0%,85%,100%{text-shadow:0 0 10px #00ff41,0 0 20px #00ff41;transform:none;filter:none}
          87%{transform:translate(-2px,0) skewX(-2deg);text-shadow:-3px 0 #ff00ff,3px 0 #00ffff;filter:hue-rotate(90deg)}
          89%{transform:translate(2px,0) skewX(1deg);text-shadow:3px 0 #ff00ff,-3px 0 #00ffff}
          91%{transform:none;filter:none}
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-4px)} 80%{transform:translateX(4px)}
        }
        @keyframes glow {
          0%,100%{box-shadow:0 0 4px #00ff41,0 0 8px #00ff41}
          50%{box-shadow:0 0 10px #00ff41,0 0 20px #00ff41,0 0 30px #00ff41}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes goldPulse {
          0%,100%{text-shadow:0 0 8px #ffd700,0 0 16px #ffd700}
          50%{text-shadow:0 0 16px #ffd700,0 0 32px #ffd700,0 0 48px #ffaa00}
        }
        @keyframes scanAnim {
          0%{top:-20%} 100%{top:120%}
        }

        .tile {
          display:inline-flex; align-items:center; justify-content:center;
          border:1px solid #005522; padding:6px 14px; cursor:pointer;
          font-size:22px; min-width:56px; background:#010d03; color:#00cc33;
          transition:all 0.12s; letter-spacing:1px;
        }
        .tile:hover { border-color:#00ff41; color:#00ff41; background:#001a0a; }
        .tile.sel {
          border-color:#80ffaa; color:#80ffaa; background:#002a12;
          box-shadow:0 0 8px #00ff41; animation:glow 1s infinite;
        }

        .slot {
          display:inline-flex; align-items:center; justify-content:center;
          border-bottom:2px solid #004418; padding:4px 8px;
          min-width:56px; min-height:42px; cursor:pointer;
          font-size:22px; transition:all 0.12s; letter-spacing:1px;
        }
        .slot.op { min-width:38px; }
        .slot.empty { color:#002a10; }
        .slot.empty:hover { border-bottom-color:#00ff41; }
        .slot.filled { color:#00ee33; border-bottom-color:#00aa22; }
        .slot.filled:hover { border-bottom-color:#00ff41; }
        .slot.is-sel { color:#80ffaa; border-bottom-color:#80ffaa; }
        .slot.done { color:#44ff99; border-bottom-color:#44ff99; }
        .slot.shaking { animation:shake 0.42s; }

        .eq-box {
          border:1px solid #004418; padding:14px 18px; margin:8px 0;
          background:#010d03; transition:all 0.3s;
        }
        .eq-box.done {
          border-color:#44ff99;
          box-shadow:0 0 16px rgba(68,255,120,0.25);
          background:#011408;
        }

        .btn {
          font-family:'VT323','Courier New',monospace;
          background:transparent; border:1px solid; cursor:pointer;
          letter-spacing:2px; transition:all 0.15s;
          padding:6px 18px; font-size:20px;
        }
        .btn-green { color:#005522; border-color:#005522; }
        .btn-green:hover { color:#00ff41; border-color:#00ff41; }
        .btn-gold { color:#ffd700; border-color:#ffd700; animation:glow 1s infinite; }
        .btn-red { color:#ff4444; border-color:#ff4444; }
        .btn-red:hover { color:#ff8888; border-color:#ff8888; }

        .crt-lines {
          position:fixed; top:0; left:0; right:0; bottom:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);
          pointer-events:none; z-index:9999;
        }
        .crt-scan {
          position:fixed; left:0; right:0; height:80px;
          background:linear-gradient(transparent,rgba(0,255,65,0.04),transparent);
          pointer-events:none; z-index:9998;
          animation:scanAnim 6s linear infinite;
        }
        .progress-dot {
          display:inline-block; width:10px; height:10px;
          border-radius:50%; margin:0 3px;
        }
      `}</style>

      <div className="crt-lines" />
      <div className="crt-scan" />

      {/* ── GAME WON ── */}
      {gameWon ? (
        <div
          style={{ textAlign: "center", paddingTop: "12vh", animation: "fadeUp 0.6s" }}
        >
          <div
            style={{
              fontSize: 58,
              color: "#ffd700",
              animation: "goldPulse 1.5s infinite",
              marginBottom: 16,
            }}
          >
            ROOT ACCESS
            <br />
            GRANTED
          </div>
          <div style={{ fontSize: 28, color: "#00ff41", marginBottom: 8 }}>
            ALL LEVELS COMPROMISED
          </div>
          <div style={{ fontSize: 22, color: "#005522", marginBottom: 40 }}>
            &gt; You are now{" "}
            <span style={{ color: "#ffd700" }}>1337</span>
          </div>
          <div style={{ fontSize: 18, color: "#003311", marginBottom: 32 }}>
            {"█".repeat(20)}
          </div>
          <button
            className="btn btn-gold"
            onClick={restartGame}
            style={{ fontSize: 26, padding: "10px 32px" }}
          >
            [RESTART PROTOCOL]
          </button>
        </div>
      ) : (
        <>
          {/* ── TITLE ── */}
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div
              style={{
                fontSize: 54,
                animation: "glitch 5s infinite",
                letterSpacing: 4,
                lineHeight: 1,
              }}
            >
              1337<span style={{ color: "#005522" }}>/</span>43
            </div>
            <div style={{ fontSize: 18, color: "#005522", letterSpacing: 8, marginTop: 2 }}>
              MATHEMATICAL EXPLOIT PUZZLE
            </div>
          </div>

          {/* ── LEVEL BAR ── */}
          <div
            style={{
              borderTop: "1px solid #003311",
              borderBottom: "1px solid #003311",
              padding: "7px 0",
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <span style={{ color: "#00aa22", fontSize: 22 }}>{lvl.name}</span>
              <span style={{ color: "#005522", fontSize: 22 }}> :: {lvl.sub}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {LEVELS.map((_, i) => (
                <span
                  key={i}
                  className="progress-dot"
                  style={{
                    background:
                      i < li ? "#00ff41" : i === li ? "#00aa22" : "#002210",
                  }}
                />
              ))}
              <span style={{ fontSize: 18, color: "#004418", marginLeft: 6 }}>
                [{li + 1}/{LEVELS.length}]
              </span>
            </div>
          </div>

          {/* ── EQUATIONS ── */}
          <div style={{ marginBottom: 18 }}>
            {lvl.equations.map((eq, ei) => {
              const val = eqVals[ei];
              const done = eqDone[ei];
              return (
                <div key={eq.id} className={`eq-box${done ? " done" : ""}`}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {eqSlots[ei].map((slot, si) => {
                      const isOp = !isNumSlot(si);
                      const slotKey = `${ei}-${si}`;
                      const isThisSel = slot && slot.id === selId;
                      let cls = "slot";
                      if (isOp) cls += " op";
                      if (!slot) cls += " empty";
                      else if (isThisSel) cls += " is-sel";
                      else if (done) cls += " done";
                      else cls += " filled";
                      if (shake === slotKey) cls += " shaking";

                      return (
                        <span
                          key={si}
                          className={cls}
                          onClick={() => clickSlot(ei, si)}
                        >
                          {slot ? String(slot.val) : isOp ? "○" : "___"}
                        </span>
                      );
                    })}

                    <span style={{ fontSize: 26, color: "#004418", margin: "0 4px" }}>
                      =
                    </span>

                    <span
                      style={{
                        fontSize: 30,
                        color: done ? "#44ff99" : "#00ff41",
                        textShadow: done ? "0 0 10px #44ff99" : undefined,
                        minWidth: 52,
                      }}
                    >
                      {eq.target}
                    </span>

                    <span style={{ marginLeft: "auto", fontSize: 18 }}>
                      {done ? (
                        <span
                          style={{ color: "#44ff99", animation: "glow 1s infinite" }}
                        >
                          ✓ MATCH
                        </span>
                      ) : val !== null ? (
                        <span style={{ color: "#004418" }}>= {val}</span>
                      ) : (
                        <span style={{ color: "#002a10" }}>?</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── TILE POOL ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 16, color: "#004418", marginBottom: 8, letterSpacing: 2 }}>
              {"// TILE_POOL :: "}
              {selTile ? (
                <span style={{ color: "#80ffaa" }}>
                  SELECTED: {String(selTile.val)}
                </span>
              ) : (
                "SELECT A TILE"
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                minHeight: 54,
                alignItems: "center",
              }}
            >
              {pool.map((tile) => (
                <span
                  key={tile.id}
                  className={`tile${selId === tile.id ? " sel" : ""}`}
                  onClick={() => clickPool(tile)}
                >
                  {String(tile.val)}
                </span>
              ))}
              {pool.length === 0 && (
                <span style={{ color: "#003311", fontSize: 18 }}>
                  [ ALL_TILES_PLACED ]
                </span>
              )}
            </div>
          </div>

          {/* ── CONTROLS ── */}
          <div
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
          >
            <button className="btn btn-green" onClick={reset}>
              [RESET]
            </button>
            {selId && (
              <button className="btn btn-red" onClick={() => setSelId(null)}>
                [DESELECT]
              </button>
            )}
            {solved && (
              <button
                className="btn btn-gold"
                onClick={nextLevel}
                style={{ fontSize: 22 }}
              >
                {li + 1 >= LEVELS.length
                  ? "[COMPLETE MISSION]"
                  : "[NEXT LEVEL >>]"}
              </button>
            )}
            {solved && (
              <span
                style={{
                  color: "#ffd700",
                  fontSize: 22,
                  animation: "goldPulse 1.5s infinite",
                }}
              >
                ⚡ ACCESS GRANTED
              </span>
            )}
          </div>

          {/* ── INSTRUCTIONS ── */}
          {!solved && (
            <div
              style={{
                marginTop: 22,
                fontSize: 15,
                color: "#003311",
                borderTop: "1px solid #002208",
                paddingTop: 10,
                lineHeight: 1.6,
              }}
            >
              {">"} Click tile to SELECT &nbsp;|&nbsp; Click empty slot to PLACE
              &nbsp;|&nbsp; Click filled slot to PICK UP &nbsp;|&nbsp; Click
              occupied slot while holding tile to SWAP
              <br />
              {">"} Even slots = numbers. Odd slots = operators (+, -, *, /).
            </div>
          )}

          {/* ── CURSOR ── */}
          <div style={{ marginTop: 12, fontSize: 18, color: "#003311" }}>
            {">"}{" "}
            <span style={{ opacity: blink ? 1 : 0 }}>█</span>
          </div>
        </>
      )}
    </div>
  );
}
