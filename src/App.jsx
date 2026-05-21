import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, ADMIN_EMAIL } from "./supabase";

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
    if (op === '+') r += n; else if (op === '-') r -= n;
    else if (op === '*') r *= n; else if (op === '/') { if (!n) return NaN; r /= n; }
  }
  return r;
}
function getFactors(n) {
  const f = [];
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) f.push([i, n / i]);
  return f;
}
function maskEmail(email) {
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
}

/* ══════════════════════════════════════════════════════════
   THEMES
══════════════════════════════════════════════════════════ */
const THEMES = [
  { id:'mainframe', name:'MAINFRAME', era:'1970s',
    lines:['SYSTEM BOOT...','INITIALIZING TERMINAL...','READY.'],
    bg:'#050e06', panel:'#010d03', p:'#00ff41', s:'#00aa22', dim:'#003311',
    dimmer:'#001a08', border:'#004418', sel:'#80ffaa', gold:'#ffd700',
    err:'#ff4444', ok:'#44ff99', font:"'VT323','Courier New',monospace",
    scanlines:true, gridLines:false, holographic:false, gc1:'#ff00ff', gc2:'#00ffff' },
  { id:'synthwave', name:'SYNTHWAVE', era:'1980s',
    lines:['NEON PROTOCOL LOADING...','SYNTHESIZING...','FEEL THE WAVE.'],
    bg:'#0d0015', panel:'#1a0028', p:'#ff44ff', s:'#cc00cc', dim:'#550055',
    dimmer:'#2a0035', border:'#7700aa', sel:'#ffaaff', gold:'#ffaa00',
    err:'#ff4455', ok:'#ff88ff', font:"'VT323','Courier New',monospace",
    scanlines:false, gridLines:true, holographic:false, gc1:'#00ffff', gc2:'#ffff00' },
  { id:'bbs', name:'BBS_ONLINE', era:'1990s',
    lines:['DIALING...','CONNECT 28800 BAUD','WELCOME TO THE BBS!'],
    bg:'#000033', panel:'#000055', p:'#00ffff', s:'#0088ff', dim:'#003366',
    dimmer:'#001133', border:'#0055aa', sel:'#88ffff', gold:'#ffff00',
    err:'#ff6666', ok:'#88ffff', font:"'VT323','Courier New',monospace",
    scanlines:false, gridLines:false, holographic:false, gc1:'#ffff00', gc2:'#ff00ff' },
  { id:'y2k', name:'Y2K_CHROME', era:'2000s',
    lines:['Y2K SAFE ✓','LOADING WINAMP...','YOU HAVE MAIL! (1 new message)'],
    bg:'#0a0a1a', panel:'#0d1a3a', p:'#00ccff', s:'#0088cc', dim:'#003355',
    dimmer:'#001122', border:'#0066aa', sel:'#88eeff', gold:'#ffcc00',
    err:'#ff4444', ok:'#88ffcc', font:"'VT323','Courier New',monospace",
    scanlines:false, gridLines:false, holographic:false, gc1:'#ff6600', gc2:'#00ffff' },
  { id:'metro', name:'METRO_FLAT', era:'2010s',
    lines:['UPDATING...','INSTALLING UPDATES (1/1)...','SWIPE TO CONTINUE.'],
    bg:'#1a1a2e', panel:'#16213e', p:'#e94560', s:'#0f3460', dim:'#533483',
    dimmer:'#0f1929', border:'#533483', sel:'#ff6b8a', gold:'#ffd700',
    err:'#e94560', ok:'#06d6a0', font:"'VT323','Helvetica',sans-serif",
    scanlines:false, gridLines:false, holographic:false, gc1:'#06d6a0', gc2:'#ffd700' },
  { id:'future', name:'FUTURE::UNKNOWN', era:'2030s+',
    lines:['TIMELINE UNDEFINED','REALITY.EXE LOADING...','YOU ARE THE SYSTEM.'],
    bg:'#000011', panel:'rgba(0,20,50,0.7)', p:'#00d4ff', s:'#ff0090', dim:'#003355',
    dimmer:'#001122', border:'#005577', sel:'#88ffff', gold:'#ff00ff',
    err:'#ff0055', ok:'#00ffaa', font:"'VT323','Courier New',monospace",
    scanlines:false, gridLines:false, holographic:true, gc1:'#ff0090', gc2:'#00ffff' },
];
function getStageIdx(levelNum) { return Math.min(Math.floor((levelNum - 1) / 5), THEMES.length - 1); }

/* ══════════════════════════════════════════════════════════
   LEVEL GENERATOR
══════════════════════════════════════════════════════════ */
let uid = 1000;
function makeEq3(target, ops) {
  for (const op of shuffle([...ops])) {
    for (let t = 0; t < 20; t++) {
      if (op==='+') { const a=randInt(1,target-1); return [a,'+',target-a]; }
      if (op==='-') { const b=randInt(1,Math.min(target,500)); return [target+b,'-',b]; }
      if (op==='*') { const f=getFactors(target); if(!f.length) continue; const [a,b]=randFrom(f); return [a,'*',b]; }
      if (op==='/') { const b=randInt(2,15); return [target*b,'/',b]; }
    }
  }
  return [target-1,'+',1];
}
function makeEq5(target, ops) {
  for (let t = 0; t < 150; t++) {
    const op1=randFrom(ops), op2=randFrom(ops), a=randInt(2,40), b=randInt(2,20);
    let inter;
    if(op1==='+') inter=a+b; else if(op1==='-'){if(a<=b)continue;inter=a-b;}
    else if(op1==='*') inter=a*b; else if(op1==='/'){if(!b||a%b!==0)continue;inter=a/b;}
    if(!inter||inter<=0) continue;
    let c;
    if(op2==='+') c=target-inter; else if(op2==='-') c=inter-target;
    else if(op2==='*'){if(!inter||target%inter!==0)continue;c=target/inter;}
    else if(op2==='/'){if(!target||inter%target!==0)continue;c=inter/target;}
    if(!Number.isInteger(c)||c<=0) continue;
    return [a,op1,b,op2,c];
  }
  return null;
}
function makeDecoys(count, ops, solVals) {
  const nums = solVals.filter(v => typeof v === 'number');
  return Array.from({length:count}, (_,i) => {
    if (i%3===0) return randFrom(ops);
    const base = nums.length ? randFrom(nums) : randInt(1,100);
    const spread = Math.max(2,Math.floor(base*0.12));
    return Math.max(1, base + (Math.random()>0.5?1:-1)*randInt(1,spread));
  });
}
const DIFF = ['EASY','EASY','NORMAL','NORMAL','HARD','HARD','EXPERT','EXPERT','ELITE','ELITE','GODMODE'];
function generateLevel(levelNum) {
  const step = levelNum - 5;
  const ops = step<=2?['+']: step<=5?['+','-']: step<=10?['+','-','*']:['+','-','*','/'];
  const use5 = step > 8 && Math.random() > 0.35;
  let eq1 = use5 ? makeEq5(1337, ops) : null;
  if (!eq1) eq1 = makeEq3(1337, ops);
  const eq2 = makeEq3(42, ops);
  const solVals = [...eq1,...eq2];
  const decoys = Math.min(1+Math.floor(step/2),7);
  const all = shuffle([...solVals,...makeDecoys(decoys,ops,solVals)]).map(val=>({id:`g${uid++}`,val}));
  return {
    id:levelNum, name:`LEVEL_${String(levelNum).padStart(2,'0')}`,
    sub:DIFF[Math.min(step-1,DIFF.length-1)],
    equations:[{id:'e0',size:eq1.length,target:1337},{id:'e1',size:eq2.length,target:42}],
    tiles:all, solution:[eq1,eq2],
  };
}
const HANDCRAFTED = [
  {id:1,name:'LEVEL_01',sub:'INITIATION',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:1000},{id:'b',val:337},{id:'c',val:40},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'+'}],
    solution:[[1000,'+',337],[40,'+',2]]},
  {id:2,name:'LEVEL_02',sub:'BYPASS',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:1330},{id:'b',val:7},{id:'c',val:84},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'/'},{id:'g',val:'+'}],
    solution:[[1330,'+',7],[84,'/',2]]},
  {id:3,name:'LEVEL_03',sub:'INFILTRATE',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:7},{id:'b',val:191},{id:'c',val:3},{id:'d',val:14},{id:'e',val:'*'},{id:'f',val:'*'},{id:'g',val:190}],
    solution:[[7,'*',191],[3,'*',14]]},
  {id:4,name:'LEVEL_04',sub:'DECRYPT',
    equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:2674},{id:'b',val:2},{id:'c',val:126},{id:'d',val:3},{id:'e',val:'/'},{id:'f',val:'/'},{id:'g',val:'+'},{id:'h',val:4}],
    solution:[[2674,'/',2],[126,'/',3]]},
  {id:5,name:'LEVEL_05',sub:'ROOT_ACCESS',
    equations:[{id:'e0',size:5,target:1337},{id:'e1',size:3,target:42}],
    tiles:[{id:'a',val:400},{id:'b',val:3},{id:'c',val:137},{id:'d',val:50},{id:'e',val:8},{id:'f',val:'*'},{id:'g',val:'+'},{id:'h',val:'-'},{id:'i',val:'+'},{id:'j',val:138}],
    solution:[[400,'*',3,'+',137],[50,'-',8]]},
];
const isNumVal = v => typeof v === 'number';
const isNumSlot = i => i % 2 === 0;
function initLevel(lvl) { return { eqSlots:lvl.equations.map(eq=>Array(eq.size).fill(null)), pool:[...lvl.tiles] }; }
function getLevel(num) { return num<=5 ? HANDCRAFTED[num-1] : generateLevel(num); }

/* ══════════════════════════════════════════════════════════
   AUTH SCREEN
══════════════════════════════════════════════════════════ */
function AuthScreen({ T }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.includes('@')) { setError('Invalid email'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', fontFamily:T.font, color:T.p, background:T.bg, padding:20 }}>
      <div style={{fontSize:52, letterSpacing:4, marginBottom:4, textShadow:`0 0 20px ${T.p}`}}>
        1337<span style={{color:T.dim}}>/</span>42
      </div>
      <div style={{fontSize:18, color:T.dim, letterSpacing:6, marginBottom:40}}>MATHEMATICAL EXPLOIT PUZZLE</div>

      {sent ? (
        <div style={{textAlign:'center', border:`1px solid ${T.border}`, padding:'30px 40px', background:T.panel}}>
          <div style={{fontSize:32, color:T.ok, marginBottom:12}}>✓ MAGIC LINK SENT</div>
          <div style={{fontSize:20, color:T.s}}>Check your email: <span style={{color:T.p}}>{email}</span></div>
          <div style={{fontSize:16, color:T.dim, marginTop:8}}>Click the link to login — no password needed.</div>
        </div>
      ) : (
        <div style={{border:`1px solid ${T.border}`, padding:'30px 40px', background:T.panel, minWidth:320}}>
          <div style={{fontSize:26, color:T.s, marginBottom:20}}>{'>'} AUTHENTICATE</div>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:16, color:T.dim, marginBottom:6}}>// EMAIL</div>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@domain.com"
                style={{
                  fontFamily:T.font, fontSize:22, background:T.bg, color:T.p,
                  border:`1px solid ${T.border}`, padding:'8px 12px', width:'100%',
                  outline:'none', letterSpacing:1,
                }}
                onFocus={e => e.target.style.borderColor=T.p}
                onBlur={e => e.target.style.borderColor=T.border}
              />
            </div>
            {error && <div style={{color:T.err, fontSize:16, marginBottom:12}}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              fontFamily:T.font, fontSize:22, background:'transparent',
              color: loading ? T.dim : T.p, border:`1px solid ${loading ? T.dim : T.p}`,
              padding:'8px 24px', cursor: loading ? 'not-allowed':'pointer',
              width:'100%', letterSpacing:2,
            }}>
              {loading ? 'SENDING...' : '[SEND MAGIC LINK]'}
            </button>
          </form>
          <div style={{fontSize:14, color:T.dimmer, marginTop:16, textAlign:'center'}}>
            No password. We email you a login link. 🔐
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BAN SCREEN
══════════════════════════════════════════════════════════ */
function BanScreen({ ban, T, onLogout }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); }, []);

  const isPermanent = !ban.banned_until;
  const remaining = ban.banned_until ? Math.max(0, new Date(ban.banned_until)-now) : null;
  const hours = remaining ? Math.floor(remaining/3600000) : 0;
  const mins = remaining ? Math.floor((remaining%3600000)/60000) : 0;
  const secs = remaining ? Math.floor((remaining%60000)/1000) : 0;
  const expired = remaining !== null && remaining <= 0;

  if (expired) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:T.font,color:T.p,background:T.bg,fontSize:32}}>BAN EXPIRED — REFRESHING...</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', fontFamily:T.font, color:T.err, background:'#0a0000', padding:20, textAlign:'center' }}>
      <div style={{fontSize:72, marginBottom:8, textShadow:'0 0 20px #ff0000, 0 0 40px #ff0000'}}>
        ACCESS DENIED
      </div>
      <div style={{fontSize:28, color:'#cc0000', marginBottom:32}}>YOUR ACCOUNT HAS BEEN SUSPENDED</div>
      <div style={{border:'1px solid #440000', background:'#0d0000', padding:'24px 40px', maxWidth:500}}>
        <div style={{fontSize:22, color:'#ff4444', marginBottom:12}}>
          REASON: <span style={{color:'#ff8888'}}>{ban.reason || 'No reason specified'}</span>
        </div>
        <div style={{fontSize:20, color:'#cc0000', marginBottom:8}}>
          {isPermanent
            ? <span style={{color:'#ff0000'}}>PERMANENT BAN</span>
            : <span>EXPIRES IN: <span style={{color:'#ff4444'}}>{hours}h {mins}m {secs}s</span></span>
          }
        </div>
        {!isPermanent && (
          <div style={{fontSize:16, color:'#440000', marginBottom:16}}>
            Until: {new Date(ban.banned_until).toLocaleString()}
          </div>
        )}
        <div style={{fontSize:16, color:'#550000', marginTop:16}}>
          Contact: <span style={{color:'#ff4444'}}>{ADMIN_EMAIL}</span>
        </div>
      </div>
      <button onClick={onLogout} style={{
        marginTop:24, fontFamily:T.font, fontSize:20, background:'transparent',
        color:'#440000', border:'1px solid #440000', padding:'8px 20px', cursor:'pointer',
      }}>[LOGOUT]</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STAGE SELECT
══════════════════════════════════════════════════════════ */
function StageSelect({ profile, T, onSelect }) {
  const maxStage = Math.min(profile.max_stage || 1, THEMES.length);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', fontFamily:T.font, color:T.p, background:T.bg, padding:20 }}>
      <div style={{fontSize:42, letterSpacing:3, marginBottom:4}}>WELCOME BACK</div>
      <div style={{fontSize:20, color:T.s, marginBottom:8}}>Stage {maxStage} reached • Level {profile.max_level}</div>
      <div style={{fontSize:18, color:T.dim, marginBottom:32}}>Choose where to start:</div>
      <div style={{display:'flex', flexDirection:'column', gap:10, width:320}}>
        {THEMES.slice(0, maxStage).map((theme, i) => {
          const startLevel = i * 5 + 1;
          return (
            <button key={i} onClick={()=>onSelect(startLevel)} style={{
              fontFamily:T.font, fontSize:22, background:'transparent',
              color:theme.p, border:`1px solid ${theme.border}`,
              padding:'10px 20px', cursor:'pointer', letterSpacing:2,
              textAlign:'left', transition:'all 0.15s',
            }}
            onMouseEnter={e=>{e.target.style.background=theme.panel;}}
            onMouseLeave={e=>{e.target.style.background='transparent';}}>
              [{i+1}] {theme.name} <span style={{color:theme.dim, fontSize:16}}>— {theme.era} — L{startLevel}</span>
            </button>
          );
        })}
        <button onClick={()=>onSelect(1)} style={{
          fontFamily:T.font, fontSize:18, background:'transparent',
          color:T.dimmer, border:`1px solid ${T.dimmer}`,
          padding:'8px 20px', cursor:'pointer', letterSpacing:2, marginTop:8,
        }}>[Start from Level 1]</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LEADERBOARD
══════════════════════════════════════════════════════════ */
function LeaderboardModal({ T, currentUserId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('id,email,max_level,max_stage')
      .order('max_level', {ascending:false}).limit(20)
      .then(({data}) => { setRows(data||[]); setLoading(false); });
  }, []);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:8000,
      display:'flex', alignItems:'center', justifyContent:'center', fontFamily:T.font }}>
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, padding:'24px 32px',
        minWidth:380, maxWidth:480, color:T.p }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <span style={{fontSize:28, color:T.gold, textShadow:`0 0 10px ${T.gold}`}}>🏆 GLOBAL LEADERBOARD</span>
          <button onClick={onClose} style={{fontFamily:T.font,fontSize:22,background:'transparent',color:T.dim,border:'none',cursor:'pointer'}}>[X]</button>
        </div>
        {loading ? (
          <div style={{color:T.dim, fontSize:20}}>LOADING...</div>
        ) : (
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:18}}>
            <thead>
              <tr style={{color:T.dim, borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:'4px 8px'}}>#</td>
                <td style={{padding:'4px 8px'}}>PLAYER</td>
                <td style={{padding:'4px 8px'}}>STAGE</td>
                <td style={{padding:'4px 8px'}}>LEVEL</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isMe = row.id === currentUserId;
                const theme = THEMES[Math.min((row.max_stage||1)-1, THEMES.length-1)];
                return (
                  <tr key={row.id} style={{
                    background: isMe ? T.dimmer : 'transparent',
                    color: isMe ? T.gold : T.s,
                    borderBottom:`1px solid ${T.dimmer}`,
                  }}>
                    <td style={{padding:'6px 8px', color: i===0?T.gold:i===1?'#aaa':i===2?'#cd7f32':T.dim}}>
                      {i===0?'◈':i+1}
                    </td>
                    <td style={{padding:'6px 8px'}}>{isMe?'▶ YOU':maskEmail(row.email||'')}</td>
                    <td style={{padding:'6px 8px', color:theme.p, fontSize:14}}>{theme.name}</td>
                    <td style={{padding:'6px 8px', color:T.p}}>{row.max_level}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={4} style={{color:T.dim,padding:12,textAlign:'center'}}>No players yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════════ */
const BAN_DURATIONS = [
  {label:'1 Hour', hours:1},
  {label:'24 Hours', hours:24},
  {label:'7 Days', hours:168},
  {label:'30 Days', hours:720},
  {label:'Permanent', hours:null},
];

function AdminPanel({ T, adminId, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banReason, setBanReason] = useState('');
  const [selectedDur, setSelectedDur] = useState(1);
  const [msg, setMsg] = useState('');

  async function loadUsers() {
    setLoading(true);
    const {data:profiles} = await supabase.from('profiles').select('id,email,max_level,is_admin').order('max_level',{ascending:false});
    const {data:bans} = await supabase.from('bans').select('*').gt('banned_until', new Date().toISOString());
    const permanentBans = await supabase.from('bans').select('*').is('banned_until', null);
    const activeBanIds = new Set([...(bans||[]), ...(permanentBans.data||[])].map(b=>b.user_id));
    setUsers((profiles||[]).map(p=>({...p, isBanned:activeBanIds.has(p.id)})));
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function banUser(userId, email) {
    const dur = BAN_DURATIONS[selectedDur];
    const banned_until = dur.hours ? new Date(Date.now() + dur.hours*3600000).toISOString() : null;
    await supabase.from('bans').insert({
      user_id: userId, banned_by: adminId,
      reason: banReason || 'Banned by admin',
      banned_until,
    });
    setMsg(`Banned ${maskEmail(email)} (${dur.label})`);
    await loadUsers();
  }

  async function unbanUser(userId, email) {
    await supabase.from('bans').delete().eq('user_id', userId);
    setMsg(`Unbanned ${maskEmail(email)}`);
    await loadUsers();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:8000,
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.font}}>
      <div style={{background:T.bg,border:`1px solid ${T.err}`,padding:'24px 28px',
        maxWidth:560,width:'100%',color:T.p,maxHeight:'80vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:26,color:T.err}}>⚠ ADMIN PANEL</span>
          <button onClick={onClose} style={{fontFamily:T.font,fontSize:22,background:'transparent',color:T.dim,border:'none',cursor:'pointer'}}>[X]</button>
        </div>

        {/* Ban controls */}
        <div style={{background:T.panel,border:`1px solid ${T.border}`,padding:12,marginBottom:16}}>
          <div style={{fontSize:18,color:T.s,marginBottom:8}}>BAN SETTINGS</div>
          <input value={banReason} onChange={e=>setBanReason(e.target.value)}
            placeholder="Reason (optional)"
            style={{fontFamily:T.font,fontSize:18,background:T.bg,color:T.p,
              border:`1px solid ${T.border}`,padding:'6px 10px',width:'100%',marginBottom:8,outline:'none'}} />
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {BAN_DURATIONS.map((d,i) => (
              <button key={i} onClick={()=>setSelectedDur(i)} style={{
                fontFamily:T.font,fontSize:16,background:selectedDur===i?T.err:'transparent',
                color:selectedDur===i?'#fff':T.err,border:`1px solid ${T.err}`,
                padding:'4px 10px',cursor:'pointer',
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        {msg && <div style={{color:T.gold,fontSize:16,marginBottom:10}}>✓ {msg}</div>}

        {/* User list */}
        {loading ? <div style={{color:T.dim,fontSize:20}}>LOADING...</div> : (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {users.map(u => (
              <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                background:u.isBanned?'rgba(80,0,0,0.3)':T.panel,border:`1px solid ${u.isBanned?T.err:T.border}`,
                padding:'8px 12px'}}>
                <div>
                  <span style={{fontSize:18,color:u.isBanned?T.err:T.s}}>{maskEmail(u.email||'')}</span>
                  {u.is_admin && <span style={{color:T.gold,fontSize:14,marginLeft:8}}>ADMIN</span>}
                  {u.isBanned && <span style={{color:T.err,fontSize:14,marginLeft:8}}>BANNED</span>}
                  <span style={{color:T.dim,fontSize:14,marginLeft:8}}>L{u.max_level}</span>
                </div>
                {u.id !== adminId && !u.is_admin && (
                  u.isBanned
                    ? <button onClick={()=>unbanUser(u.id,u.email)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.ok,border:`1px solid ${T.ok}`,padding:'4px 12px',cursor:'pointer'}}>[UNBAN]</button>
                    : <button onClick={()=>banUser(u.id,u.email)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.err,border:`1px solid ${T.err}`,padding:'4px 12px',cursor:'pointer'}}>[BAN]</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TRANSITION SCREEN
══════════════════════════════════════════════════════════ */
function TransitionScreen({ theme, onDone }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t1=setTimeout(()=>setLineIdx(1),700);
    const t2=setTimeout(()=>setLineIdx(2),1400);
    const t3=setTimeout(()=>{setDone(true);setTimeout(onDone,400);},2200);
    return ()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:9000,background:theme.bg,fontFamily:theme.font,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      opacity:done?0:1,transition:'opacity 0.4s'}}>
      <div style={{fontSize:52,color:theme.p,marginBottom:8,textShadow:`0 0 20px ${theme.p}`,letterSpacing:4}}>
        {theme.name}
      </div>
      <div style={{fontSize:28,color:theme.gold,marginBottom:32,textShadow:`0 0 10px ${theme.gold}`}}>ERA: {theme.era}</div>
      <div style={{fontSize:20,color:theme.dim,height:80,textAlign:'center'}}>
        {theme.lines.slice(0,lineIdx+1).map((l,i)=>(
          <div key={i} style={{color:i===lineIdx?theme.s:theme.dim,marginBottom:4}}>{l}</div>
        ))}
      </div>
      <div style={{width:200,height:2,background:theme.dim,marginTop:24,position:'relative'}}>
        <div style={{position:'absolute',left:0,top:0,height:'100%',background:theme.p,
          width:`${((lineIdx+1)/theme.lines.length)*100}%`,transition:'width 0.6s',boxShadow:`0 0 8px ${theme.p}`}} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
const HINT_COOLDOWN = 30;

export default function App() {
  // Auth
  const [user, setUser]         = useState(null);
  const [profile, setProfile]   = useState(null);
  const [activeBan, setActiveBan] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showStageSelect, setShowStageSelect] = useState(false);

  // Game
  const [levelNum, setLevelNum] = useState(1);
  const [level, setLevel]       = useState(HANDCRAFTED[0]);
  const [eqSlots, setEqSlots]   = useState(() => initLevel(HANDCRAFTED[0]).eqSlots);
  const [pool, setPool]         = useState(() => initLevel(HANDCRAFTED[0]).pool);
  const [selId, setSelId]       = useState(null);
  const [solved, setSolved]     = useState(false);
  const [shake, setShake]       = useState(null);
  const [blink, setBlink]       = useState(true);
  const [hintActive, setHintActive]     = useState(false);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [cleared, setCleared]   = useState(0);
  const [showTransition, setShowTransition] = useState(false);
  const [nextLevelNum, setNextLevelNum]     = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAdmin, setShowAdmin]             = useState(false);
  const cooldownRef = useRef(null);

  const theme = THEMES[getStageIdx(levelNum)];
  const T = theme;

  // ── AUTH INIT ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) initUser(session.user);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) initUser(session.user);
      else { setUser(null); setProfile(null); setActiveBan(null); setAuthLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function initUser(u) {
    setUser(u);
    // Load profile
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single();
    setProfile(prof);
    // Check bans
    const now = new Date().toISOString();
    const { data: bans } = await supabase.from('bans').select('*')
      .eq('user_id', u.id)
      .or(`banned_until.is.null,banned_until.gt.${now}`)
      .order('created_at', {ascending:false}).limit(1);
    if (bans && bans.length > 0) { setActiveBan(bans[0]); setAuthLoading(false); return; }
    setActiveBan(null);
    setAuthLoading(false);
    // Show stage select if has progress
    if (prof && prof.max_level > 1) setShowStageSelect(true);
  }

  async function saveProgress(newLevel) {
    if (!user || !profile) return;
    const newStage = getStageIdx(newLevel) + 1;
    if (newLevel > (profile.max_level||1) || newStage > (profile.max_stage||1)) {
      const updates = {
        max_level: Math.max(profile.max_level||1, newLevel),
        max_stage: Math.max(profile.max_stage||1, newStage),
      };
      await supabase.from('profiles').update(updates).eq('id', user.id);
      setProfile(p => ({...p, ...updates}));
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null); setActiveBan(null);
  }

  // ── CURSOR ──
  useEffect(() => { const t=setInterval(()=>setBlink(b=>!b),530); return ()=>clearInterval(t); }, []);

  // ── WIN DETECTION ──
  useEffect(() => {
    if (solved) return;
    const win = level.equations.every((eq,ei) => evalSlots(eqSlots[ei]) === eq.target);
    if (win) {
      setSolved(true);
      setCleared(c => c+1);
      saveProgress(levelNum);
    }
  }, [eqSlots, level, solved]);

  function loadLevel(num) {
    const lvl = getLevel(num);
    setLevel(lvl);
    const {eqSlots:s, pool:p} = initLevel(lvl);
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
      setPool(p => [...p,cur]); setSelId(cur.id);
    } else {
      if (!ok(sel)) return shk();
      setPool(p => [...p.filter(t => t.id !== sel.id), cur]);
      setEqSlots(prev => { const n=prev.map(r=>[...r]); n[ei][si]=sel; return n; });
      setSelId(null);
    }
  }

  function reset() {
    const {eqSlots:s, pool:p} = initLevel(level);
    setEqSlots(s); setPool(p); setSelId(null); setSolved(false);
  }

  function next() {
    const n = levelNum + 1;
    if (getStageIdx(n) !== getStageIdx(levelNum)) {
      setNextLevelNum(n); setShowTransition(true);
    } else { setLevelNum(n); loadLevel(n); }
  }

  function afterTransition() {
    setShowTransition(false); setLevelNum(nextLevelNum); loadLevel(nextLevelNum);
  }

  function activateHint() {
    if (hintCooldown>0 || hintActive || solved) return;
    setHintActive(true);
    setTimeout(()=>setHintActive(false),4000);
    setHintCooldown(HINT_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(()=>{
      setHintCooldown(c=>{ if(c<=1){clearInterval(cooldownRef.current);return 0;} return c-1; });
    },1000);
  }

  // ── LOADING ──
  if (authLoading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',
        background:'#050e06',color:'#00ff41',fontFamily:"'VT323',monospace",fontSize:32}}>
        AUTHENTICATING...
      </div>
    );
  }

  // ── AUTH ──
  if (!user) return <AuthScreen T={THEMES[0]} />;

  // ── BANNED ──
  if (activeBan) return <BanScreen ban={activeBan} T={THEMES[0]} onLogout={handleLogout} />;

  // ── STAGE SELECT ──
  if (showStageSelect) return (
    <StageSelect profile={profile} T={T} onSelect={num => {
      setShowStageSelect(false);
      setLevelNum(num); loadLevel(num);
    }} />
  );

  const eqVals = eqSlots.map(s => evalSlots(s));
  const eqDone = level.equations.map((eq,ei) => eqVals[ei] === eq.target);
  const selTile = pool.find(t => t.id === selId);
  const isAdmin = user?.email === ADMIN_EMAIL;

  const bgStyle = T.holographic
    ? {background:'linear-gradient(-45deg,#000011,#001133,#000033,#002244)',backgroundSize:'400% 400%',animation:'holoShift 10s ease infinite'}
    : {background:T.bg};

  const themeCSS = `
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
    * { box-sizing:border-box; }
    @keyframes glitch {
      0%,84%,100%{text-shadow:0 0 10px ${T.p},0 0 20px ${T.p};transform:none;filter:none}
      86%{transform:translate(-2px,0) skewX(-2deg);text-shadow:-3px 0 ${T.gc1},3px 0 ${T.gc2};filter:hue-rotate(60deg)}
      88%{transform:translate(2px,0);text-shadow:3px 0 ${T.gc1},-3px 0 ${T.gc2}}
      90%{transform:none;filter:none}
    }
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
    @keyframes glow{0%,100%{box-shadow:0 0 4px ${T.p},0 0 8px ${T.p}}50%{box-shadow:0 0 12px ${T.p},0 0 24px ${T.p},0 0 36px ${T.p}}}
    @keyframes goldGlow{0%,100%{text-shadow:0 0 8px ${T.gold},0 0 16px ${T.gold}}50%{text-shadow:0 0 20px ${T.gold},0 0 40px ${T.gold}}}
    @keyframes scanAnim{0%{top:-10%}100%{top:110%}}
    @keyframes holoShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes hintPulse{0%,100%{border-bottom-color:${T.gold};opacity:0.6}50%{opacity:1}}
    .tile{display:inline-flex;align-items:center;justify-content:center;border:1px solid ${T.border};padding:6px 14px;cursor:pointer;font-size:22px;min-width:56px;background:${T.panel};color:${T.s};transition:all 0.12s;letter-spacing:1px;font-family:inherit;}
    .tile:hover{border-color:${T.p};color:${T.p};filter:brightness(1.2)}
    .tile.sel{border-color:${T.sel};color:${T.sel};box-shadow:0 0 8px ${T.p};animation:glow 1s infinite}
    .slot{display:inline-flex;align-items:center;justify-content:center;border-bottom:2px solid ${T.border};padding:4px 8px;min-width:56px;min-height:42px;cursor:pointer;font-size:22px;transition:all 0.12s;letter-spacing:1px;}
    .slot.op{min-width:38px}
    .slot.empty{color:${T.dimmer}}.slot.empty:hover{border-bottom-color:${T.p}}
    .slot.filled{color:${T.p};border-bottom-color:${T.s}}.slot.filled:hover{border-bottom-color:${T.p}}
    .slot.is-sel{color:${T.sel};border-bottom-color:${T.sel}}
    .slot.done{color:${T.ok};border-bottom-color:${T.ok}}
    .slot.shaking{animation:shake 0.42s}
    .slot.hinting{border-bottom-color:${T.gold};animation:hintPulse 0.7s infinite}
    .eq-box{border:1px solid ${T.border};padding:14px 18px;margin:8px 0;background:${T.panel};transition:all 0.3s;}
    .eq-box.done{border-color:${T.ok};box-shadow:0 0 16px rgba(68,255,120,0.2);background:${T.dimmer}}
    .btn{font-family:inherit;background:transparent;border:1px solid;cursor:pointer;letter-spacing:2px;transition:all 0.15s;padding:6px 18px;font-size:20px;}
    .crt-scan{position:fixed;left:0;right:0;height:80px;background:linear-gradient(transparent,rgba(0,255,65,0.03),transparent);pointer-events:none;z-index:9998;animation:scanAnim 7s linear infinite;}
    .hint-bar{border:1px solid ${T.gold};padding:8px 14px;margin-bottom:12px;font-size:17px;color:${T.gold};background:rgba(255,215,0,0.05);animation:hintPulse 0.7s infinite;}
  `;

  return (
    <div style={{fontFamily:T.font,color:T.p,minHeight:'100vh',padding:'16px 20px',
      userSelect:'none',position:'relative',overflow:'hidden',boxSizing:'border-box',
      transition:'background 1s,color 0.5s',...bgStyle}}>
      <style>{themeCSS}</style>

      {T.scanlines && <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,
        background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)'}} />}
      {T.scanlines && <div className="crt-scan" />}
      {T.gridLines && <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9997,
        backgroundImage:`linear-gradient(rgba(255,0,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,255,0.07) 1px,transparent 1px)`,
        backgroundSize:'44px 44px'}} />}

      {showTransition && <TransitionScreen theme={THEMES[getStageIdx(nextLevelNum)]} onDone={afterTransition} />}
      {showLeaderboard && <LeaderboardModal T={T} currentUserId={user?.id} onClose={()=>setShowLeaderboard(false)} />}
      {showAdmin && isAdmin && <AdminPanel T={T} adminId={user?.id} onClose={()=>setShowAdmin(false)} />}

      {/* ── TITLE ── */}
      <div style={{textAlign:'center',marginBottom:10}}>
        <div style={{fontSize:52,animation:'glitch 5s infinite',letterSpacing:4,lineHeight:1}}>
          1337<span style={{color:T.dim}}>/</span>42
        </div>
        <div style={{fontSize:16,color:T.dim,letterSpacing:7,marginTop:2}}>MATHEMATICAL EXPLOIT PUZZLE</div>
        <div style={{fontSize:14,color:T.s,marginTop:2,letterSpacing:3}}>◈ {T.name} ◈ {T.era} ◈</div>
      </div>

      {/* ── TOP BAR ── */}
      <div style={{borderTop:`1px solid ${T.dim}`,borderBottom:`1px solid ${T.dim}`,
        padding:'6px 0',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <div>
          <span style={{color:T.s,fontSize:20}}>{level.name}</span>
          <span style={{color:T.dim,fontSize:20}}> :: {level.sub}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14,color:T.dim}}>
            {maskEmail(user?.email||'')}
          </span>
          <button onClick={()=>setShowLeaderboard(true)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.gold,border:`1px solid ${T.gold}`,padding:'3px 10px',cursor:'pointer',letterSpacing:1}}>🏆</button>
          {isAdmin && <button onClick={()=>setShowAdmin(true)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.err,border:`1px solid ${T.err}`,padding:'3px 10px',cursor:'pointer'}}>⚠ ADMIN</button>}
          <button onClick={handleLogout} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.dim,border:`1px solid ${T.dim}`,padding:'3px 10px',cursor:'pointer'}}>LOGOUT</button>
          <div style={{display:'flex',gap:3}}>
            {THEMES.map((_,i)=>(
              <span key={i} style={{display:'inline-block',width:8,height:8,borderRadius:'50%',
                background:i<getStageIdx(levelNum)?T.p:i===getStageIdx(levelNum)?T.s:T.dimmer,
                boxShadow:i===getStageIdx(levelNum)?`0 0 6px ${T.p}`:'none'}} />
            ))}
          </div>
        </div>
      </div>

      {/* ── HINT BANNER ── */}
      {hintActive && (
        <div className="hint-bar">
          ⚡ HINT :: {level.equations.map((eq,ei)=>(
            <span key={ei} style={{marginRight:20}}>{level.solution[ei].map(String).join(' ')} = {eq.target}</span>
          ))}
        </div>
      )}

      {/* ── EQUATIONS ── */}
      <div style={{marginBottom:14}}>
        {level.equations.map((eq,ei) => {
          const val=eqVals[ei], done=eqDone[ei];
          return (
            <div key={eq.id} className={`eq-box${done?' done':''}`}>
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                {eqSlots[ei].map((slot,si) => {
                  const isOp=!isNumSlot(si), k=`${ei}-${si}`, isSel=slot&&slot.id===selId;
                  const hintEmpty=hintActive&&!slot;
                  let cls=`slot${isOp?' op':''}`;
                  if(!slot) cls+=' empty'; else if(isSel) cls+=' is-sel'; else if(done) cls+=' done'; else cls+=' filled';
                  if(shake===k) cls+=' shaking';
                  if(hintEmpty) cls+=' hinting';
                  const hv=hintEmpty&&level.solution?.[ei]?.[si];
                  return (
                    <span key={si} className={cls} onClick={()=>clickSlot(ei,si)}>
                      {slot?String(slot.val):hv!==undefined&&hv!==false?<span style={{color:T.gold,opacity:0.7}}>{String(hv)}</span>:(isOp?'○':'___')}
                    </span>
                  );
                })}
                <span style={{fontSize:26,color:T.dim,margin:'0 4px'}}>=</span>
                <span style={{fontSize:30,minWidth:52,color:done?T.ok:T.p,textShadow:done?`0 0 10px ${T.ok}`:undefined}}>
                  {eq.target}
                </span>
                <span style={{marginLeft:'auto',fontSize:18}}>
                  {done?<span style={{color:T.ok,animation:'glow 1s infinite'}}>✓ MATCH</span>
                    :val!==null?<span style={{color:T.dim}}>= {val}</span>
                    :<span style={{color:T.dimmer}}>?</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── POOL ── */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,color:T.dim,marginBottom:6,letterSpacing:2}}>
          {'// TILE_POOL :: '}{selTile?<span style={{color:T.sel}}>SELECTED: {String(selTile.val)}</span>:'SELECT A TILE'}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',minHeight:52,alignItems:'center'}}>
          {pool.map(tile=>(
            <span key={tile.id} className={`tile${selId===tile.id?' sel':''}`} onClick={()=>clickPool(tile)}>
              {String(tile.val)}
            </span>
          ))}
          {pool.length===0&&<span style={{color:T.dim,fontSize:18}}>[ ALL_TILES_PLACED ]</span>}
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <button className="btn" style={{color:T.dim,borderColor:T.dim}} onClick={reset}>[RESET]</button>
        {selId&&<button className="btn" style={{color:T.err,borderColor:T.err}} onClick={()=>setSelId(null)}>[DESELECT]</button>}
        {!solved&&(
          <button className="btn" onClick={activateHint}
            style={{color:hintActive?T.gold:hintCooldown>0?T.dimmer:T.s,
              borderColor:hintActive?T.gold:hintCooldown>0?T.dimmer:T.border,
              cursor:hintCooldown>0?'not-allowed':'pointer'}}>
            {hintActive?'[HINT ON]':hintCooldown>0?`[HINT ${hintCooldown}s]`:'[HINT]'}
          </button>
        )}
        {solved&&(
          <>
            <button className="btn" onClick={next} style={{color:T.gold,borderColor:T.gold,fontSize:22,animation:'glow 1s infinite'}}>
              {getStageIdx(levelNum+1)!==getStageIdx(levelNum)?`[ENTER ${THEMES[getStageIdx(levelNum+1)].era} >>]`:'[NEXT LEVEL >>]'}
            </button>
            <span style={{color:T.gold,fontSize:22,animation:'goldGlow 1.5s infinite'}}>⚡ ACCESS GRANTED</span>
          </>
        )}
      </div>

      {!solved&&levelNum<=2&&(
        <div style={{marginTop:12,fontSize:14,color:T.dimmer,borderTop:`1px solid ${T.dimmer}`,paddingTop:8,lineHeight:1.7}}>
          {'>'} Click tile→SELECT | Empty slot→PLACE | Filled slot→PICK UP | Filled+holding→SWAP
        </div>
      )}
      <div style={{marginTop:12,fontSize:18,color:T.dim}}>{'> '}<span style={{opacity:blink?1:0}}>█</span></div>
    </div>
  );
}
