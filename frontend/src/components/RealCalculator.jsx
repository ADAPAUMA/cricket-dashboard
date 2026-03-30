import { useState, useEffect } from 'react';

const HISTORY_KEY = 'calc_history';
const MAX_HISTORY = 45;

export default function RealCalculator({ onClose }) {
  const [display, setDisplay]   = useState('0');   // current number being typed
  const [liveExpr, setLiveExpr] = useState('0');   // FULL visible expression e.g. "5 × 3"
  const [prev, setPrev]         = useState(null);
  const [op, setOp]             = useState(null);
  const [fresh, setFresh]       = useState(false);
  const [history, setHistory]   = useState([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistory(h);
    } catch {}
  }, []);

  const saveHistory = (entry) => {
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const fmt = (n) => {
    if (n === 'Error' || isNaN(n)) return 'Error';
    const s = parseFloat(parseFloat(n).toFixed(10)).toString();
    return s.length > 16 ? parseFloat(n).toExponential(6) : s;
  };

  const press = (val) => {
    let next;
    if (fresh) {
      next = val === '.' ? '0.' : val;
      setFresh(false);
    } else {
      if (val === '.' && display.includes('.')) return;
      if (display.length >= 16) return;
      next = display === '0' && val !== '.' ? val : display + val;
    }
    setDisplay(next);
    // Update live expression: replace last number part
    setLiveExpr(prev => {
      if (op) {
        // expression is like "5 × " — append the new digit
        const base = `${prev_num} ${op} `;
        return base + next;
      }
      return next;
    });
  };

  const calc = (a, b, o) => {
    const fa = parseFloat(a), fb = parseFloat(b);
    if (o === '+') return fa + fb;
    if (o === '−') return fa - fb;
    if (o === '×') return fa * fb;
    if (o === '÷') return fb !== 0 ? fa / fb : 'Error';
    return fb;
  };

  const operate = (nextOp) => {
    const cur = display;
    let base;
    if (prev !== null && op && !fresh) {
      const result = fmt(calc(prev, cur, op));
      base = result;
      setDisplay(result);
      setPrev(result);
    } else {
      base = cur;
      setPrev(cur);
    }
    setOp(nextOp);
    setLiveExpr(`${base} ${nextOp} `);
    setFresh(true);
  };

  const equals = () => {
    if (prev === null || !op) return;
    const result = fmt(calc(prev, display, op));
    const entry = `${prev} ${op} ${display} = ${result}`;
    saveHistory({ expr: entry, result, time: new Date().toLocaleTimeString() });
    setLiveExpr(entry);
    setDisplay(result);
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const clear     = () => { setDisplay('0'); setLiveExpr('0'); setPrev(null); setOp(null); setFresh(false); };
  const clearAll  = () => { clear(); };
  const delLast   = () => {
    setDisplay(d => {
      const next = d.length > 1 && !(d.length===2&&d[0]==='-') ? d.slice(0,-1) : '0';
      setLiveExpr(le => {
        if (op) return `${prev} ${op} ${next}`;
        return next;
      });
      return next;
    });
  };
  const toggleSign= () => {
    const next = fmt(parseFloat(display) * -1);
    setDisplay(next);
    setLiveExpr(op ? `${prev} ${op} ${next}` : next);
  };
  const percent   = () => {
    const next = fmt(parseFloat(display) / 100);
    setDisplay(next);
    setLiveExpr(op ? `${prev} ${op} ${next}` : next);
  };
  const sqrt      = () => {
    const v = parseFloat(display);
    const r = v >= 0 ? fmt(Math.sqrt(v)) : 'Error';
    const entry = `√(${v}) = ${r}`;
    saveHistory({ expr: entry, result: r, time: new Date().toLocaleTimeString() });
    setDisplay(r); setLiveExpr(entry); setFresh(true);
  };
  const square    = () => {
    const v = parseFloat(display);
    const r = fmt(v * v);
    const entry = `${v}² = ${r}`;
    saveHistory({ expr: entry, result: r, time: new Date().toLocaleTimeString() });
    setDisplay(r); setLiveExpr(entry); setFresh(true);
  };

  // needed for liveExpr closure
  const prev_num = prev;

  // Recall a history item
  const recallHistory = (item) => {
    const val = item.result === 'Error' ? '0' : item.result;
    setDisplay(val);
    setLiveExpr(item.expr);
    setFresh(true);
    setPrev(null); setOp(null);
  };

  // 5 × 5 button grid  (25 buttons)
  const BUTTONS = [
    { label: 'AC',  action: clearAll,         type: 'fn'  },
    { label: '⌫',   action: delLast,          type: 'fn'  },
    { label: '%',   action: percent,           type: 'fn'  },
    { label: '√',   action: sqrt,             type: 'fn'  },
    { label: '÷',   action: () => operate('÷'), type: 'op' },

    { label: '7',  action: () => press('7'),  type: 'num' },
    { label: '8',  action: () => press('8'),  type: 'num' },
    { label: '9',  action: () => press('9'),  type: 'num' },
    { label: 'x²', action: square,            type: 'fn'  },
    { label: '×',  action: () => operate('×'), type: 'op' },

    { label: '4',  action: () => press('4'),  type: 'num' },
    { label: '5',  action: () => press('5'),  type: 'num' },
    { label: '6',  action: () => press('6'),  type: 'num' },
    { label: '+/−',action: toggleSign,        type: 'fn'  },
    { label: '−',  action: () => operate('−'), type: 'op' },

    { label: '1',  action: () => press('1'),  type: 'num' },
    { label: '2',  action: () => press('2'),  type: 'num' },
    { label: '3',  action: () => press('3'),  type: 'num' },
    { label: '',   action: null,              type: 'empty'},
    { label: '+',  action: () => operate('+'), type: 'op' },

    { label: '0',  action: () => press('0'),  type: 'num' },
    { label: '00', action: () => press('00' === '0' ? '0' : (display==='0'?'0':display+'00')), type:'num'},
    { label: '.',  action: () => press('.'),  type: 'num' },
    { label: '',   action: null,              type: 'empty'},
    { label: '=',  action: equals,            type: 'eq'  },
  ];

  // fix 00 press
  const btn00 = () => {
    if (display === '0') return;
    if (display.length < 15) setDisplay(fresh ? '0' : display + '00');
  };

  const bgForType = (t, lbl) => {
    if (t === 'op') return '#ff9f0a';
    if (t === 'eq') return '#30d158';
    if (t === 'fn') return '#48484a';
    if (t === 'empty') return 'transparent';
    return '#2c2c2e';
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'#000',
      display:'flex', flexDirection:'row',
      fontFamily:'SF Pro Display, Inter, sans-serif',
    }}>

      {/* ── LEFT: Calculator ─────────────────────── */}
      <div style={{
        flex:'0 0 340px', display:'flex', flexDirection:'column',
        borderRight:'1px solid #1c1c1e', padding:16, gap:10,
      }}>

        {/* Close btn */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'#888', fontSize:13 }}>🧮 Calculator</span>
          <button onClick={onClose} style={{
            background:'#1c1c1e', border:'none', color:'#fff',
            borderRadius:20, padding:'4px 14px', cursor:'pointer', fontSize:13,
          }}>✕ Close</button>
        </div>

        {/* Live Expression — always shows full expression as you type */}
        <div style={{
          textAlign:'right', padding:'4px 8px 12px',
          fontSize: liveExpr.length > 20 ? 18 : liveExpr.length > 12 ? 24 : 36,
          color:'#fff', fontWeight:300, lineHeight:1.3,
          wordBreak:'break-all', minHeight:60,
          display:'flex', alignItems:'flex-end', justifyContent:'flex-end',
        }}>
          {liveExpr || '0'}
        </div>

        {/* 5×5 Button Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, flex:1 }}>
          {BUTTONS.map((b, i) => (
            <button key={i}
              onClick={b.label==='00' ? btn00 : b.action}
              disabled={b.type==='empty'}
              style={{
                background: bgForType(b.type, b.label),
                color: b.type==='empty' ? 'transparent' : '#fff',
                border:'none', borderRadius:12,
                fontSize:18, fontWeight: b.type==='op'||b.type==='eq'?700:400,
                cursor: b.type==='empty' ? 'default' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                minHeight:52,
                transition:'opacity 0.1s',
                opacity: b.type==='empty'?0:1,
              }}
              onMouseDown={e => { if(b.type!=='empty') e.currentTarget.style.opacity='0.6'; }}
              onMouseUp={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='1'}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: History (stores up to 45) ────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', padding:16, gap:8, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ color:'#f5c518', fontWeight:700, fontSize:16 }}>📋 History ({history.length}/{MAX_HISTORY})</span>
          {history.length > 0 && (
            <button onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY); }}
              style={{ background:'#48484a', border:'none', color:'#fff', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12 }}>
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:14 }}>
            No history yet. Start calculating!
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {history.map((item, i) => (
              <div key={i}
                style={{
                  background:'#1c1c1e', borderRadius:10, padding:'10px 14px',
                  border:'1px solid #2c2c2e',
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
                }}
                onMouseEnter={e => e.currentTarget.style.background='#2c2c2e'}
                onMouseLeave={e => e.currentTarget.style.background='#1c1c1e'}
              >
                {/* Click expression area to recall */}
                <div style={{ flex:1, cursor:'pointer' }} onClick={() => recallHistory(item)}>
                  <div style={{ fontSize:13, color:'#888', marginBottom:3 }}>{item.expr}</div>
                  <div style={{ fontSize:20, color:'#fff', fontWeight:300 }}>{item.result}</div>
                </div>
                <div style={{ fontSize:11, color:'#555', whiteSpace:'nowrap' }}>{item.time}</div>
                {/* Per-line delete button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setHistory(prev => {
                      const next = prev.filter((_, idx) => idx !== i);
                      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                      return next;
                    });
                  }}
                  title="Remove this entry"
                  style={{
                    background:'none', border:'1px solid #444', color:'#888',
                    borderRadius:6, width:26, height:26, cursor:'pointer',
                    fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#e63946'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#e63946'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#888'; e.currentTarget.style.borderColor='#444'; }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
