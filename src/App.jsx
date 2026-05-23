import { useState, useEffect, useRef } from "react";
import { supabase, ADMIN_EMAIL } from "./supabase";

/* ══════ UTILS ══════════════════════════════════════════════ */
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
    if (op==='+') r+=n; else if (op==='-') r-=n;
    else if (op==='*') r*=n; else if (op==='/') { if(!n) return NaN; r/=n; }
  }
  return r;
}
function getFactors(n) {
  const f = [];
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) f.push([i, n/i]);
  return f;
}
const maskEmail = email => {
  if (!email) return '';
  const [u, d] = email.split('@');
  return u.slice(0,2) + '***@' + d;
};

/* ══════ THEMES ═════════════════════════════════════════════ */
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
    lines:['Y2K SAFE ✓','LOADING WINAMP...','YOU HAVE MAIL!'],
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
const getStageIdx = levelNum => Math.min(Math.floor((levelNum-1)/5), THEMES.length-1);

/* ══════ LEVEL GENERATOR ════════════════════════════════════ */
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
  const nums = solVals.filter(v => typeof v==='number');
  return Array.from({length:count},(_,i)=>{
    if(i%3===0) return randFrom(ops);
    const base=nums.length?randFrom(nums):randInt(1,100);
    const spread=Math.max(2,Math.floor(base*0.12));
    return Math.max(1,base+(Math.random()>0.5?1:-1)*randInt(1,spread));
  });
}
const DIFF=['EASY','EASY','NORMAL','NORMAL','HARD','HARD','EXPERT','EXPERT','ELITE','ELITE','GODMODE'];
function generateLevel(levelNum) {
  const step=levelNum-5;
  const ops=step<=2?['+']: step<=5?['+','-']: step<=10?['+','-','*']:['+','-','*','/'];
  const use5=step>8&&Math.random()>0.35;
  let eq1=use5?makeEq5(1337,ops):null; if(!eq1) eq1=makeEq3(1337,ops);
  const eq2=makeEq3(42,ops);
  const solVals=[...eq1,...eq2];
  const dc=Math.min(1+Math.floor(step/2),7);
  const all=shuffle([...solVals,...makeDecoys(dc,ops,solVals)]).map(val=>({id:`g${uid++}`,val}));
  return { id:levelNum, name:`LEVEL_${String(levelNum).padStart(2,'0')}`,
    sub:DIFF[Math.min(step-1,DIFF.length-1)],
    equations:[{id:'e0',size:eq1.length,target:1337},{id:'e1',size:eq2.length,target:42}],
    tiles:all, solution:[eq1,eq2] };
}
const HANDCRAFTED=[
  {id:1,name:'LEVEL_01',sub:'INITIATION',equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
   tiles:[{id:'a',val:1000},{id:'b',val:337},{id:'c',val:40},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'+'}],solution:[[1000,'+',337],[40,'+',2]]},
  {id:2,name:'LEVEL_02',sub:'BYPASS',equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
   tiles:[{id:'a',val:1330},{id:'b',val:7},{id:'c',val:84},{id:'d',val:2},{id:'e',val:'+'},{id:'f',val:'/'},{id:'g',val:'+'}],solution:[[1330,'+',7],[84,'/',2]]},
  {id:3,name:'LEVEL_03',sub:'INFILTRATE',equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
   tiles:[{id:'a',val:7},{id:'b',val:191},{id:'c',val:3},{id:'d',val:14},{id:'e',val:'*'},{id:'f',val:'*'},{id:'g',val:190}],solution:[[7,'*',191],[3,'*',14]]},
  {id:4,name:'LEVEL_04',sub:'DECRYPT',equations:[{id:'e0',size:3,target:1337},{id:'e1',size:3,target:42}],
   tiles:[{id:'a',val:2674},{id:'b',val:2},{id:'c',val:126},{id:'d',val:3},{id:'e',val:'/'},{id:'f',val:'/'},{id:'g',val:'+'},{id:'h',val:4}],solution:[[2674,'/',2],[126,'/',3]]},
  {id:5,name:'LEVEL_05',sub:'ROOT_ACCESS',equations:[{id:'e0',size:5,target:1337},{id:'e1',size:3,target:42}],
   tiles:[{id:'a',val:400},{id:'b',val:3},{id:'c',val:137},{id:'d',val:50},{id:'e',val:8},{id:'f',val:'*'},{id:'g',val:'+'},{id:'h',val:'-'},{id:'i',val:'+'},{id:'j',val:138}],solution:[[400,'*',3,'+',137],[50,'-',8]]},
];
const isNumVal=v=>typeof v==='number';
const isNumSlot=i=>i%2===0;
function initLevel(lvl){return{eqSlots:lvl.equations.map(eq=>Array(eq.size).fill(null)),pool:[...lvl.tiles]};}
function getLevel(num){return num<=5?HANDCRAFTED[num-1]:generateLevel(num);}

/* ══════ AUTH SCREEN ════════════════════════════════════════ */
function AuthScreen({ T }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPw]     = useState('');
  const [pw2, setPw2]         = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email || !password) { setError('Fill in email and password'); return; }
    if (mode==='signup' && password!==pw2) { setError('Passwords do not match'); return; }
    if (mode==='signup' && password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    if (mode==='login') {
      const {error:err} = await supabase.auth.signInWithPassword({email,password});
      if (err) setError(err.message);
    } else {
      const {error:err} = await supabase.auth.signUp({
        email, password,
        options:{ data:{ username: username||email.split('@')[0] } }
      });
      if (err) setError(err.message);
      else setInfo('Account created! You can now log in.');
    }
    setLoading(false);
  }

  const inp = {
    fontFamily:T.font, fontSize:22, background:T.bg, color:T.p,
    border:`1px solid ${T.border}`, padding:'8px 12px', width:'100%', outline:'none',
  };

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',fontFamily:T.font,color:T.p,background:T.bg,padding:20}}>
      <div style={{fontSize:52,letterSpacing:4,marginBottom:4,textShadow:`0 0 20px ${T.p}`}}>
        1337<span style={{color:T.dim}}>/</span>42
      </div>
      <div style={{fontSize:18,color:T.dim,letterSpacing:6,marginBottom:32}}>MATHEMATICAL EXPLOIT PUZZLE</div>

      <div style={{border:`1px solid ${T.border}`,background:T.panel,minWidth:340,padding:'28px 36px'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,marginBottom:24,borderBottom:`1px solid ${T.border}`}}>
          {['login','signup'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError('');setInfo('');}}
              style={{fontFamily:T.font,fontSize:22,background:'transparent',
                color:mode===m?T.p:T.dim, border:'none',
                borderBottom:mode===m?`2px solid ${T.p}`:'2px solid transparent',
                padding:'6px 20px',cursor:'pointer',letterSpacing:2,marginBottom:-1}}>
              {m==='login'?'LOGIN':'CREATE ACCOUNT'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          {mode==='signup' && (
            <div>
              <div style={{fontSize:15,color:T.dim,marginBottom:4}}>// USERNAME (optional)</div>
              <input style={inp} value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="hacker_name" autoComplete="username" />
            </div>
          )}
          <div>
            <div style={{fontSize:15,color:T.dim,marginBottom:4}}>// EMAIL</div>
            <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="user@domain.com" autoComplete="email" />
          </div>
          <div>
            <div style={{fontSize:15,color:T.dim,marginBottom:4}}>// PASSWORD</div>
            <input style={inp} type="password" value={password} onChange={e=>setPw(e.target.value)}
              placeholder="••••••••" autoComplete={mode==='login'?'current-password':'new-password'} />
          </div>
          {mode==='signup' && (
            <div>
              <div style={{fontSize:15,color:T.dim,marginBottom:4}}>// CONFIRM PASSWORD</div>
              <input style={inp} type="password" value={pw2} onChange={e=>setPw2(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" />
            </div>
          )}
          {error && <div style={{color:T.err,fontSize:17}}>{error}</div>}
          {info  && <div style={{color:T.ok, fontSize:17}}>{info}</div>}
          <button type="submit" disabled={loading} style={{
            fontFamily:T.font,fontSize:22,background:'transparent',
            color:loading?T.dim:T.p, border:`1px solid ${loading?T.dim:T.p}`,
            padding:'10px',cursor:loading?'not-allowed':'pointer',letterSpacing:2,marginTop:4,
          }}>
            {loading?'...':(mode==='login'?'[LOGIN]':'[CREATE ACCOUNT]')}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════ BAN SCREEN ═════════════════════════════════════════ */
function BanScreen({ ban, T, onLogout }) {
  const [now, setNow] = useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const remaining = ban.banned_until ? Math.max(0,new Date(ban.banned_until)-now) : null;
  const h=remaining?Math.floor(remaining/3600000):0;
  const m=remaining?Math.floor((remaining%3600000)/60000):0;
  const s=remaining?Math.floor((remaining%60000)/1000):0;
  if (remaining!==null && remaining<=0) window.location.reload();
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',fontFamily:T.font,color:'#ff0000',background:'#0a0000',padding:20,textAlign:'center'}}>
      <div style={{fontSize:72,marginBottom:8,textShadow:'0 0 20px #ff0000,0 0 40px #ff0000'}}>ACCESS DENIED</div>
      <div style={{fontSize:28,color:'#cc0000',marginBottom:32}}>ACCOUNT SUSPENDED</div>
      <div style={{border:'1px solid #440000',background:'#0d0000',padding:'24px 40px',maxWidth:500}}>
        <div style={{fontSize:22,color:'#ff4444',marginBottom:12}}>
          REASON: <span style={{color:'#ff8888'}}>{ban.reason||'No reason given'}</span>
        </div>
        <div style={{fontSize:20,color:'#cc0000'}}>
          {!ban.banned_until
            ? <span style={{color:'#ff0000'}}>PERMANENT BAN</span>
            : <span>EXPIRES IN: <span style={{color:'#ff4444'}}>{h}h {m}m {s}s</span></span>}
        </div>
        <div style={{fontSize:15,color:'#440000',marginTop:16}}>
          Contact: <span style={{color:'#ff4444'}}>{ADMIN_EMAIL}</span>
        </div>
      </div>
      <button onClick={onLogout} style={{marginTop:24,fontFamily:T.font,fontSize:20,background:'transparent',
        color:'#440000',border:'1px solid #440000',padding:'8px 20px',cursor:'pointer'}}>[LOGOUT]</button>
    </div>
  );
}

/* ══════ STAGE SELECT ═══════════════════════════════════════ */
function StageSelect({ profile, T, onSelect, onContinue }) {
  const maxStage = Math.min(profile.max_stage||1, THEMES.length);
  const maxLevel = profile.max_level||1;

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',fontFamily:T.font,color:T.p,background:T.bg,padding:20}}>
      <div style={{fontSize:42,letterSpacing:3,marginBottom:4,textShadow:`0 0 15px ${T.p}`}}>
        WELCOME BACK
      </div>
      <div style={{fontSize:20,color:T.s,marginBottom:4}}>
        {maskEmail(profile.email)} — Level {maxLevel} — Stage {maxStage}
      </div>
      <div style={{fontSize:17,color:T.dim,marginBottom:28}}>
        Choose a stage to start from:
      </div>

      {/* Stage grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%',maxWidth:520,marginBottom:16}}>
        {THEMES.map((theme,i)=>{
          const stageNum = i+1;
          const unlocked = stageNum <= maxStage;
          const startLevel = i*5+1;
          const isCurrent = getStageIdx(maxLevel)===i;
          return (
            <button key={i} onClick={()=>unlocked&&onSelect(startLevel)}
              disabled={!unlocked}
              style={{
                fontFamily:T.font, textAlign:'left', padding:'12px 16px',
                background: unlocked ? theme.panel : 'rgba(10,10,10,0.5)',
                border:`1px solid ${unlocked ? (isCurrent?theme.p:theme.border) : '#1a1a1a'}`,
                color: unlocked ? theme.p : '#333',
                cursor: unlocked ? 'pointer':'not-allowed',
                transition:'all 0.15s',
                boxShadow: isCurrent ? `0 0 12px ${theme.p}44` : 'none',
              }}
              onMouseEnter={e=>{ if(unlocked){ e.currentTarget.style.background=theme.bg; e.currentTarget.style.borderColor=theme.p; }}}
              onMouseLeave={e=>{ if(unlocked){ e.currentTarget.style.background=theme.panel; e.currentTarget.style.borderColor=isCurrent?theme.p:theme.border; }}}>
              <div style={{fontSize:18,letterSpacing:1}}>
                {unlocked ? (isCurrent?'▶ ':'') : '🔒 '}
                {theme.name}
              </div>
              <div style={{fontSize:14,color:unlocked?theme.s:'#222',marginTop:2}}>
                {theme.era} — Level {startLevel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      <button onClick={()=>onContinue(maxLevel)} style={{
        fontFamily:T.font, fontSize:24, background:'transparent',
        color:T.gold, border:`2px solid ${T.gold}`,
        padding:'10px 32px', cursor:'pointer', letterSpacing:2,
        boxShadow:`0 0 12px ${T.gold}44`,
      }}>
        [▶ CONTINUE FROM LEVEL {maxLevel}]
      </button>
    </div>
  );
}

/* ══════ LEADERBOARD ════════════════════════════════════════ */
function LeaderboardModal({ T, currentUserId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    supabase.from('profiles').select('id,email,max_level,max_stage')
      .order('max_level',{ascending:false}).limit(20)
      .then(({data})=>{setRows(data||[]);setLoading(false);});
  },[]);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:8000,
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.font}}>
      <div style={{background:T.bg,border:`1px solid ${T.border}`,padding:'24px 28px',
        minWidth:380,maxWidth:460,color:T.p,maxHeight:'80vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:28,color:T.gold,textShadow:`0 0 10px ${T.gold}`}}>🏆 LEADERBOARD</span>
          <button onClick={onClose} style={{fontFamily:T.font,fontSize:22,background:'transparent',color:T.dim,border:'none',cursor:'pointer'}}>[X]</button>
        </div>
        {loading ? <div style={{color:T.dim,fontSize:20}}>LOADING...</div> : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:18}}>
            <thead>
              <tr style={{color:T.dim,borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:'4px 8px'}}>#</td>
                <td style={{padding:'4px 8px'}}>PLAYER</td>
                <td style={{padding:'4px 8px'}}>STAGE</td>
                <td style={{padding:'4px 8px'}}>LVL</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i)=>{
                const isMe=row.id===currentUserId;
                const th=THEMES[Math.min((row.max_stage||1)-1,THEMES.length-1)];
                return (
                  <tr key={row.id} style={{background:isMe?T.dimmer:'transparent',
                    color:isMe?T.gold:T.s,borderBottom:`1px solid ${T.dimmer}`}}>
                    <td style={{padding:'6px 8px',color:i===0?'#ffd700':i===1?'#aaa':i===2?'#cd7f32':T.dim}}>
                      {i===0?'◈':i+1}
                    </td>
                    <td style={{padding:'6px 8px'}}>{isMe?'▶ YOU':maskEmail(row.email||'')}</td>
                    <td style={{padding:'6px 8px',color:th.p,fontSize:14}}>{th.name}</td>
                    <td style={{padding:'6px 8px'}}>{row.max_level}</td>
                  </tr>
                );
              })}
              {rows.length===0&&<tr><td colSpan={4} style={{color:T.dim,padding:12,textAlign:'center'}}>No players yet</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ══════ ADMIN PANEL ════════════════════════════════════════ */
const BAN_DURATIONS=[{label:'1h',h:1},{label:'24h',h:24},{label:'7d',h:168},{label:'30d',h:720},{label:'Permanent',h:null}];

function AdminPanel({ T, adminId, onClose }) {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [reason,setReason]=useState('');
  const [durIdx,setDurIdx]=useState(1);
  const [msg,setMsg]=useState('');

  async function load() {
    setLoading(true);
    const {data:profiles}=await supabase.from('profiles').select('id,email,max_level,is_admin').order('max_level',{ascending:false});
    const {data:tempBans}=await supabase.from('bans').select('user_id').gt('banned_until',new Date().toISOString());
    const {data:permBans}=await supabase.from('bans').select('user_id').is('banned_until',null);
    const banned=new Set([...(tempBans||[]),...(permBans||[])].map(b=>b.user_id));
    setUsers((profiles||[]).map(p=>({...p,isBanned:banned.has(p.id)})));
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function banUser(uid,email) {
    const dur=BAN_DURATIONS[durIdx];
    const until=dur.h?new Date(Date.now()+dur.h*3600000).toISOString():null;
    await supabase.from('bans').insert({user_id:uid,banned_by:adminId,reason:reason||'Banned by admin',banned_until:until});
    setMsg(`Banned ${maskEmail(email)} (${dur.label})`);
    await load();
  }
  async function unbanUser(uid,email) {
    await supabase.from('bans').delete().eq('user_id',uid);
    setMsg(`Unbanned ${maskEmail(email)}`);
    await load();
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:8000,
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.font}}>
      <div style={{background:T.bg,border:`1px solid ${T.err}`,padding:'24px 28px',
        maxWidth:540,width:'100%',color:T.p,maxHeight:'82vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:26,color:T.err}}>⚠ ADMIN PANEL</span>
          <button onClick={onClose} style={{fontFamily:T.font,fontSize:22,background:'transparent',color:T.dim,border:'none',cursor:'pointer'}}>[X]</button>
        </div>
        {/* Controls */}
        <div style={{background:T.panel,border:`1px solid ${T.border}`,padding:12,marginBottom:14}}>
          <div style={{fontSize:17,color:T.s,marginBottom:8}}>BAN SETTINGS</div>
          <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason..."
            style={{fontFamily:T.font,fontSize:18,background:T.bg,color:T.p,border:`1px solid ${T.border}`,
              padding:'6px 10px',width:'100%',marginBottom:8,outline:'none'}} />
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {BAN_DURATIONS.map((d,i)=>(
              <button key={i} onClick={()=>setDurIdx(i)} style={{fontFamily:T.font,fontSize:16,
                background:durIdx===i?T.err:'transparent',color:durIdx===i?'#fff':T.err,
                border:`1px solid ${T.err}`,padding:'3px 10px',cursor:'pointer'}}>{d.label}</button>
            ))}
          </div>
        </div>
        {msg&&<div style={{color:T.gold,fontSize:16,marginBottom:10}}>✓ {msg}</div>}
        {loading?<div style={{color:T.dim,fontSize:20}}>LOADING...</div>:(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {users.map(u=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                background:u.isBanned?'rgba(80,0,0,0.3)':T.panel,
                border:`1px solid ${u.isBanned?T.err:T.border}`,padding:'8px 12px'}}>
                <div>
                  <span style={{fontSize:17,color:u.isBanned?T.err:T.s}}>{maskEmail(u.email||'')}</span>
                  {u.is_admin&&<span style={{color:T.gold,fontSize:13,marginLeft:8}}>ADMIN</span>}
                  {u.isBanned&&<span style={{color:T.err,fontSize:13,marginLeft:8}}>BANNED</span>}
                  <span style={{color:T.dim,fontSize:13,marginLeft:8}}>L{u.max_level}</span>
                </div>
                {u.id!==adminId&&!u.is_admin&&(
                  u.isBanned
                    ?<button onClick={()=>unbanUser(u.id,u.email)} style={{fontFamily:T.font,fontSize:15,background:'transparent',color:T.ok,border:`1px solid ${T.ok}`,padding:'3px 10px',cursor:'pointer'}}>[UNBAN]</button>
                    :<button onClick={()=>banUser(u.id,u.email)} style={{fontFamily:T.font,fontSize:15,background:'transparent',color:T.err,border:`1px solid ${T.err}`,padding:'3px 10px',cursor:'pointer'}}>[BAN]</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════ TRANSITION ═════════════════════════════════════════ */
function TransitionScreen({ theme:th, onDone }) {
  const [li,setLi]=useState(0);
  const [done,setDone]=useState(false);
  useEffect(()=>{
    const t1=setTimeout(()=>setLi(1),700);
    const t2=setTimeout(()=>setLi(2),1400);
    const t3=setTimeout(()=>{setDone(true);setTimeout(onDone,400);},2200);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);
  return (
    <div style={{position:'fixed',inset:0,zIndex:9000,background:th.bg,fontFamily:th.font,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      opacity:done?0:1,transition:'opacity 0.4s'}}>
      <div style={{fontSize:52,color:th.p,marginBottom:8,textShadow:`0 0 20px ${th.p}`,letterSpacing:4}}>{th.name}</div>
      <div style={{fontSize:28,color:th.gold,marginBottom:32,textShadow:`0 0 10px ${th.gold}`}}>ERA: {th.era}</div>
      <div style={{fontSize:20,color:th.dim,height:80,textAlign:'center'}}>
        {th.lines.slice(0,li+1).map((l,i)=>(<div key={i} style={{color:i===li?th.s:th.dim,marginBottom:4}}>{l}</div>))}
      </div>
      <div style={{width:200,height:2,background:th.dim,marginTop:24,position:'relative'}}>
        <div style={{position:'absolute',left:0,top:0,height:'100%',background:th.p,
          width:`${((li+1)/th.lines.length)*100}%`,transition:'width 0.6s',boxShadow:`0 0 8px ${th.p}`}} />
      </div>
    </div>
  );
}

/* ══════ MAIN APP ═══════════════════════════════════════════ */
export default function App() {
  const [user,setUser]               = useState(null);
  const [profile,setProfile]         = useState(null);
  const [activeBan,setActiveBan]     = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [showStageSelect,setShowStageSelect] = useState(false);
  const [levelNum,setLevelNum]       = useState(1);
  const [level,setLevel]             = useState(HANDCRAFTED[0]);
  const [eqSlots,setEqSlots]         = useState(()=>initLevel(HANDCRAFTED[0]).eqSlots);
  const [pool,setPool]               = useState(()=>initLevel(HANDCRAFTED[0]).pool);
  const [selId,setSelId]             = useState(null);
  const [solved,setSolved]           = useState(false);
  const [shake,setShake]             = useState(null);
  const [blink,setBlink]             = useState(true);
  const [cleared,setCleared]         = useState(0);
  const [showTransition,setShowTransition] = useState(false);
  const [nextLevelNum,setNextLevelNum]     = useState(null);
  const [showLeaderboard,setShowLeaderboard] = useState(false);
  const [showAdmin,setShowAdmin]           = useState(false);

  const T = THEMES[getStageIdx(levelNum)];

  /* AUTH */
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user) initUser(session.user); else setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_ev,session)=>{
      if(session?.user) initUser(session.user);
      else{setUser(null);setProfile(null);setActiveBan(null);setAuthLoading(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  async function initUser(u) {
    setUser(u);
    const {data:prof}=await supabase.from('profiles').select('*').eq('id',u.id).single();
    setProfile(prof);
    const now=new Date().toISOString();
    const {data:bans}=await supabase.from('bans').select('*').eq('user_id',u.id)
      .or(`banned_until.is.null,banned_until.gt.${now}`)
      .order('created_at',{ascending:false}).limit(1);
    if(bans&&bans.length>0){setActiveBan(bans[0]);setAuthLoading(false);return;}
    setActiveBan(null);
    setAuthLoading(false);
    if(prof&&prof.max_level>1) setShowStageSelect(true);
  }

  async function saveProgress(newLevel) {
    if(!user||!profile) return;
    const ns=getStageIdx(newLevel)+1;
    const updates={
      max_level:Math.max(profile.max_level||1,newLevel),
      max_stage:Math.max(profile.max_stage||1,ns),
    };
    await supabase.from('profiles').update(updates).eq('id',user.id);
    setProfile(p=>({...p,...updates}));
  }

  async function handleLogout(){await supabase.auth.signOut();}

  useEffect(()=>{const t=setInterval(()=>setBlink(b=>!b),530);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    if(solved) return;
    const win=level.equations.every((eq,ei)=>evalSlots(eqSlots[ei])===eq.target);
    if(win){setSolved(true);setCleared(c=>c+1);saveProgress(levelNum);}
  },[eqSlots,level,solved]);

  function loadLevel(num){
    const lvl=getLevel(num);
    setLevel(lvl);
    const{eqSlots:s,pool:p}=initLevel(lvl);
    setEqSlots(s);setPool(p);setSelId(null);setSolved(false);
  }

  function clickPool(tile){if(solved)return;setSelId(id=>id===tile.id?null:tile.id);}

  function clickSlot(ei,si){
    if(solved)return;
    const cur=eqSlots[ei][si], sel=pool.find(t=>t.id===selId);
    const shk=()=>{const k=`${ei}-${si}`;setShake(k);setTimeout(()=>setShake(null),420);};
    const ok=t=>isNumSlot(si)?isNumVal(t.val):!isNumVal(t.val);
    if(!cur&&!sel) return;
    if(!cur){
      if(!sel||!ok(sel)) return shk();
      setPool(p=>p.filter(t=>t.id!==sel.id));
      setEqSlots(prev=>{const n=prev.map(r=>[...r]);n[ei][si]=sel;return n;});
      setSelId(null);
    } else if(!sel){
      setEqSlots(prev=>{const n=prev.map(r=>[...r]);n[ei][si]=null;return n;});
      setPool(p=>[...p,cur]);setSelId(cur.id);
    } else {
      if(!ok(sel)) return shk();
      setPool(p=>[...p.filter(t=>t.id!==sel.id),cur]);
      setEqSlots(prev=>{const n=prev.map(r=>[...r]);n[ei][si]=sel;return n;});
      setSelId(null);
    }
  }

  function reset(){const{eqSlots:s,pool:p}=initLevel(level);setEqSlots(s);setPool(p);setSelId(null);setSolved(false);}

  function next(){
    const n=levelNum+1;
    if(getStageIdx(n)!==getStageIdx(levelNum)){setNextLevelNum(n);setShowTransition(true);}
    else{setLevelNum(n);loadLevel(n);}
  }

  function startAt(num){
    setShowStageSelect(false);
    setLevelNum(num);loadLevel(num);
  }

  if(authLoading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',
      background:'#050e06',color:'#00ff41',fontFamily:"'VT323',monospace",fontSize:32}}>
      AUTHENTICATING...
    </div>
  );
  if(!user) return <AuthScreen T={THEMES[0]} />;
  if(activeBan) return <BanScreen ban={activeBan} T={THEMES[0]} onLogout={handleLogout} />;
  if(showStageSelect) return(
    <StageSelect profile={profile} T={T}
      onSelect={startAt}
      onContinue={startAt} />
  );

  const eqVals=eqSlots.map(s=>evalSlots(s));
  const eqDone=level.equations.map((eq,ei)=>eqVals[ei]===eq.target);
  const selTile=pool.find(t=>t.id===selId);
  const isAdmin=user?.email===ADMIN_EMAIL;

  const bgStyle=T.holographic
    ?{background:'linear-gradient(-45deg,#000011,#001133,#000033,#002244)',backgroundSize:'400% 400%',animation:'holoShift 10s ease infinite'}
    :{background:T.bg};

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
    *{box-sizing:border-box;}
    @keyframes glitch{0%,84%,100%{text-shadow:0 0 10px ${T.p},0 0 20px ${T.p};transform:none;filter:none}86%{transform:translate(-2px,0) skewX(-2deg);text-shadow:-3px 0 ${T.gc1},3px 0 ${T.gc2};filter:hue-rotate(60deg)}88%{transform:translate(2px,0);text-shadow:3px 0 ${T.gc1},-3px 0 ${T.gc2}}90%{transform:none;filter:none}}
    @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
    @keyframes glow{0%,100%{box-shadow:0 0 4px ${T.p},0 0 8px ${T.p}}50%{box-shadow:0 0 12px ${T.p},0 0 24px ${T.p}}}
    @keyframes goldGlow{0%,100%{text-shadow:0 0 8px ${T.gold},0 0 16px ${T.gold}}50%{text-shadow:0 0 20px ${T.gold},0 0 40px ${T.gold}}}
    @keyframes scanAnim{0%{top:-10%}100%{top:110%}}
    @keyframes holoShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    .tile{display:inline-flex;align-items:center;justify-content:center;border:1px solid ${T.border};padding:6px 14px;cursor:pointer;font-size:22px;min-width:56px;background:${T.panel};color:${T.s};transition:all 0.12s;letter-spacing:1px;font-family:inherit;}
    .tile:hover{border-color:${T.p};color:${T.p};filter:brightness(1.2)}
    .tile.sel{border-color:${T.sel};color:${T.sel};box-shadow:0 0 8px ${T.p};animation:glow 1s infinite}
    .slot{display:inline-flex;align-items:center;justify-content:center;border-bottom:2px solid ${T.border};padding:4px 8px;min-width:56px;min-height:42px;cursor:pointer;font-size:22px;transition:all 0.12s;letter-spacing:1px;}
    .slot.op{min-width:38px}.slot.empty{color:${T.dimmer}}.slot.empty:hover{border-bottom-color:${T.p}}
    .slot.filled{color:${T.p};border-bottom-color:${T.s}}.slot.filled:hover{border-bottom-color:${T.p}}
    .slot.is-sel{color:${T.sel};border-bottom-color:${T.sel}}.slot.done{color:${T.ok};border-bottom-color:${T.ok}}
    .slot.shaking{animation:shake 0.42s}
    .eq-box{border:1px solid ${T.border};padding:14px 18px;margin:8px 0;background:${T.panel};transition:all 0.3s;}
    .eq-box.done{border-color:${T.ok};box-shadow:0 0 16px rgba(68,255,120,0.2);background:${T.dimmer}}
    .btn{font-family:inherit;background:transparent;border:1px solid;cursor:pointer;letter-spacing:2px;transition:all 0.15s;padding:6px 18px;font-size:20px;}
    .crt-scan{position:fixed;left:0;right:0;height:80px;background:linear-gradient(transparent,rgba(0,255,65,0.03),transparent);pointer-events:none;z-index:9998;animation:scanAnim 7s linear infinite;}
  `;

  return (
    <div style={{fontFamily:T.font,color:T.p,minHeight:'100vh',padding:'16px 20px',
      userSelect:'none',position:'relative',overflow:'hidden',boxSizing:'border-box',
      transition:'background 1s,color 0.5s',...bgStyle}}>
      <style>{css}</style>
      {T.scanlines&&<><div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)'}}/><div className="crt-scan"/></>}
      {T.gridLines&&<div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9997,backgroundImage:`linear-gradient(rgba(255,0,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,0,255,0.07) 1px,transparent 1px)`,backgroundSize:'44px 44px'}}/>}

      {showTransition&&<TransitionScreen theme={THEMES[getStageIdx(nextLevelNum)]} onDone={()=>{setShowTransition(false);setLevelNum(nextLevelNum);loadLevel(nextLevelNum);}}/>}
      {showLeaderboard&&<LeaderboardModal T={T} currentUserId={user?.id} onClose={()=>setShowLeaderboard(false)}/>}
      {showAdmin&&isAdmin&&<AdminPanel T={T} adminId={user?.id} onClose={()=>setShowAdmin(false)}/>}

      {/* TITLE */}
      <div style={{textAlign:'center',marginBottom:10}}>
        <div style={{fontSize:52,animation:'glitch 5s infinite',letterSpacing:4,lineHeight:1}}>
          1337<span style={{color:T.dim}}>/</span>42
        </div>
        <div style={{fontSize:14,color:T.s,marginTop:2,letterSpacing:3}}>◈ {T.name} ◈ {T.era} ◈</div>
      </div>

      {/* TOP BAR */}
      <div style={{borderTop:`1px solid ${T.dim}`,borderBottom:`1px solid ${T.dim}`,
        padding:'6px 0',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <div>
          <span style={{color:T.s,fontSize:20}}>{level.name}</span>
          <span style={{color:T.dim,fontSize:20}}> :: {level.sub}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontSize:14,color:T.dim}}>{maskEmail(user?.email||'')}</span>
          <button onClick={()=>setShowStageSelect(true)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.s,border:`1px solid ${T.border}`,padding:'3px 10px',cursor:'pointer'}}>STAGES</button>
          <button onClick={()=>setShowLeaderboard(true)} style={{fontFamily:T.font,fontSize:16,background:'transparent',color:T.gold,border:`1px solid ${T.gold}`,padding:'3px 10px',cursor:'pointer'}}>🏆</button>
          {isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{fontFamily:T.font,fontSize:15,background:'transparent',color:T.err,border:`1px solid ${T.err}`,padding:'3px 8px',cursor:'pointer'}}>⚠ ADMIN</button>}
          <button onClick={handleLogout} style={{fontFamily:T.font,fontSize:15,background:'transparent',color:T.dim,border:`1px solid ${T.dim}`,padding:'3px 8px',cursor:'pointer'}}>LOGOUT</button>
          <div style={{display:'flex',gap:3}}>
            {THEMES.map((_,i)=><span key={i} style={{display:'inline-block',width:8,height:8,borderRadius:'50%',
              background:i<getStageIdx(levelNum)?T.p:i===getStageIdx(levelNum)?T.s:T.dimmer,
              boxShadow:i===getStageIdx(levelNum)?`0 0 6px ${T.p}`:'none'}}/>)}
          </div>
        </div>
      </div>

      {/* EQUATIONS */}
      <div style={{marginBottom:14}}>
        {level.equations.map((eq,ei)=>{
          const val=eqVals[ei],done=eqDone[ei];
          return(
            <div key={eq.id} className={`eq-box${done?' done':''}`}>
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                {eqSlots[ei].map((slot,si)=>{
                  const isOp=!isNumSlot(si),k=`${ei}-${si}`,isSel=slot&&slot.id===selId;
                  let cls=`slot${isOp?' op':''}`;
                  if(!slot) cls+=' empty'; else if(isSel) cls+=' is-sel'; else if(done) cls+=' done'; else cls+=' filled';
                  if(shake===k) cls+=' shaking';
                  return(<span key={si} className={cls} onClick={()=>clickSlot(ei,si)}>{slot?String(slot.val):(isOp?'○':'___')}</span>);
                })}
                <span style={{fontSize:26,color:T.dim,margin:'0 4px'}}>=</span>
                <span style={{fontSize:30,minWidth:52,color:done?T.ok:T.p,textShadow:done?`0 0 10px ${T.ok}`:undefined}}>{eq.target}</span>
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

      {/* POOL */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:15,color:T.dim,marginBottom:6,letterSpacing:2}}>
          {'// TILE_POOL :: '}{selTile?<span style={{color:T.sel}}>SELECTED: {String(selTile.val)}</span>:'SELECT A TILE'}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',minHeight:52,alignItems:'center'}}>
          {pool.map(tile=>(<span key={tile.id} className={`tile${selId===tile.id?' sel':''}`} onClick={()=>clickPool(tile)}>{String(tile.val)}</span>))}
          {pool.length===0&&<span style={{color:T.dim,fontSize:18}}>[ ALL_TILES_PLACED ]</span>}
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <button className="btn" style={{color:T.dim,borderColor:T.dim}} onClick={reset}>[RESET]</button>
        {selId&&<button className="btn" style={{color:T.err,borderColor:T.err}} onClick={()=>setSelId(null)}>[DESELECT]</button>}
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
