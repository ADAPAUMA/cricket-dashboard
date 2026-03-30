import { useState, useEffect, useRef, useCallback } from 'react';
import RealCalculator from '../components/RealCalculator';
import * as XLSX from 'xlsx';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEF_ROWS = 50;
const DEF_COLS = 8;
const COL_W    = 120;  // default column width px
const ROW_H    = 24;   // row height px
const STORAGE  = 'xl_sheet_v2';

// ── Helpers ───────────────────────────────────────────────────────────────────
const colName = (i) => {
  let s = '', n = i + 1;
  while (n > 0) { s = String.fromCharCode(64 + ((n - 1) % 26 + 1)) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const addr = (r, c) => `${colName(c)}${r + 1}`;

const parseAddr = (a) => {
  const m = a.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  const col = m[1].split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: parseInt(m[2]) - 1, col };
};

// ── Safe recursive descent expression evaluator ───────────────────────────────
function calcExpr(str) {
  const t = tokenize(str);
  let p = 0;
  const peek = () => t[p];
  const eat  = () => t[p++];

  function expr()  { let v = term(); while (['+','-'].includes(peek())) { const op=eat(); v=op==='+'?v+term():v-term(); } return v; }
  function term()  { let v = unary(); while (['*','/'].includes(peek())) { const op=eat(); const r=unary(); v=op==='*'?v*r:r===0?Infinity:v/r; } return v; }
  function unary() { if(peek()==='-'){eat();return-fact();} if(peek()==='+'){eat();} return fact(); }
  function fact()  {
    if (peek() === '(') { eat(); const v=expr(); if(peek()===')') eat(); return v; }
    const v = eat();
    return typeof v === 'number' ? v : 0;
  }
  try { return expr(); } catch { return NaN; }
}

function tokenize(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    if (' \t'.includes(s[i])) { i++; continue; }
    if ('+-*/()'.includes(s[i])) { t.push(s[i++]); continue; }
    if (/[\d.]/.test(s[i])) {
      let n = ''; while (i < s.length && /[\d.]/.test(s[i])) n += s[i++];
      t.push(parseFloat(n)); continue;
    }
    i++;
  }
  return t;
}

// ── Formula evaluator ─────────────────────────────────────────────────────────
function evalFormula(raw, getData) {
  try {
    let e = raw.slice(1).toUpperCase().trim();

    // expand ranges  A1:B3 → values
    e = e.replace(/([A-Z]+\d+):([A-Z]+\d+)/g, (_, a, b) => {
      const from = parseAddr(a), to = parseAddr(b);
      if (!from || !to) return '0';
      const vs = [];
      for (let r = from.row; r <= to.row; r++)
        for (let c = from.col; c <= to.col; c++)
          vs.push(getData(r, c));
      return vs.join(',');
    });

    // built-in functions
    const nums = s => s.split(',').map(Number).filter(n => !isNaN(n));
    e = e.replace(/SUM\(([^)]*)\)/g,     (_, a) => nums(a).reduce((s,v)=>s+v, 0));
    e = e.replace(/AVERAGE\(([^)]*)\)/g, (_, a) => { const n=nums(a); return n.length ? n.reduce((s,v)=>s+v,0)/n.length : 0; });
    e = e.replace(/MIN\(([^)]*)\)/g,     (_, a) => Math.min(...nums(a)));
    e = e.replace(/MAX\(([^)]*)\)/g,     (_, a) => Math.max(...nums(a)));
    e = e.replace(/COUNT\(([^)]*)\)/g,   (_, a) => nums(a).length);
    e = e.replace(/ABS\(([^)]*)\)/g,     (_, a) => Math.abs(Number(a)||0));
    e = e.replace(/SQRT\(([^)]*)\)/g,    (_, a) => Math.sqrt(Number(a)||0));
    e = e.replace(/ROUND\(([^,]*),([^)]*)\)/g,(_, a,b) => +(Number(a).toFixed(Number(b)||0)));
    e = e.replace(/IF\(([^,]*),([^,]*),([^)]*)\)/g,(_, cnd,yes,no) => {
      try { return calcExpr(cnd) ? (Number(yes)||0) : (Number(no)||0); } catch { return 0; }
    });

    // single cell refs
    e = e.replace(/([A-Z]+)(\d+)/g, (_, c, r) => {
      const ref = parseAddr(`${c}${r}`);
      return ref ? getData(ref.row, ref.col) : 0;
    });

    const result = calcExpr(e);
    if (!isFinite(result) || isNaN(result)) return isNaN(result) ? '#ERROR' : '#DIV/0!';
    // clean up trailing zeros
    return +result.toFixed(10) + '';
  } catch { return '#ERROR'; }
}

// ── Initial data ──────────────────────────────────────────────────────────────
const makeGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array(cols).fill(''));

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [data, setData]         = useState(() => makeGrid(DEF_ROWS, DEF_COLS));
  const [rows, setRows]         = useState(DEF_ROWS);
  const [cols, setCols]         = useState(DEF_COLS);
  const [sel,  setSel]          = useState({ r: 0, c: 0 });   // selected cell
  const [edit, setEdit]         = useState(null);              // { r, c } or null
  const [editVal, setEditVal]   = useState('');
  const [showCalc, setShowCalc] = useState(false);
  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', matches: '', playing: '', eating: '', amount: '' });
  const [editRowIdx, setEditRowIdx] = useState(null); // row index being edited via form
  const inputRef  = useRef(null);
  const gridRef   = useRef(null);

  // persist
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE) || 'null');
      if (s) { setData(s.data); setRows(s.data.length); setCols(s.data[0]?.length || DEF_COLS); }
    } catch {}
  }, []);

  const persist = useCallback((d) => {
    localStorage.setItem(STORAGE, JSON.stringify({ data: d }));
  }, []);

  // focus input when editing starts
  useEffect(() => {
    if (edit && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [edit]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const getData = useCallback((r, c, d = data) => {
    const raw = d[r]?.[c] ?? '';
    if (!raw) return 0;
    if (raw.startsWith('=')) return Number(evalFormula(raw, (rr, cc) => getData(rr, cc, d))) || 0;
    return Number(raw) || 0;
  }, [data]);

  const getDisp = (r, c) => {
    const raw = data[r]?.[c] ?? '';
    if (!raw) return '';
    if (raw.startsWith('=')) return evalFormula(raw, (rr, cc) => getData(rr, cc));
    return raw;
  };

  const setCell = (r, c, val, d = data) => {
    const next = d.map(row => [...row]);
    if (!next[r]) return d;
    next[r][c] = val;
    persist(next);
    setData(next);
    return next;
  };

  // ── navigation ───────────────────────────────────────────────────────────────
  const move = (dr, dc) => {
    setSel(s => ({
      r: Math.max(0, Math.min(rows - 1, s.r + dr)),
      c: Math.max(0, Math.min(cols - 1, s.c + dc)),
    }));
  };

  const startEdit = (r, c, init) => {
    setEdit({ r, c });
    setEditVal(init !== undefined ? init : (data[r]?.[c] ?? ''));
    setSel({ r, c });
  };

  const commitEdit = (goDown = false) => {
    if (!edit) return;
    setCell(edit.r, edit.c, editVal);
    setEdit(null);
    // Excel: Enter → go down, Tab → go right
    if (goDown) move(1, 0);
  };

  const cancelEdit = () => {
    setEdit(null);
    setEditVal('');
  };

  // ── keyboard (grid level) ─────────────────────────────────────────────────────
  const onGridKey = (e) => {
    if (edit) return;
    const { r, c } = sel;

    switch (e.key) {
      case 'ArrowUp':    move(-1, 0); e.preventDefault(); break;
      case 'ArrowDown':  move(1,  0); e.preventDefault(); break;
      case 'ArrowLeft':  move(0, -1); e.preventDefault(); break;
      case 'ArrowRight': move(0,  1); e.preventDefault(); break;
      case 'Tab':        move(0,  1); e.preventDefault(); break;
      case 'Enter':      startEdit(r, c, undefined); e.preventDefault(); break;
      case 'F2':         startEdit(r, c, undefined); e.preventDefault(); break;
      case 'Delete':
      case 'Backspace':
        setCell(r, c, ''); e.preventDefault(); break;
      case 'Escape': break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          startEdit(r, c, e.key); e.preventDefault();
        }
    }
  };

  // ── keyboard (cell input level) ──────────────────────────────────────────────
  const onCellKey = (e) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        commitEdit(true);   // move down (Excel behaviour)
        setTimeout(() => gridRef.current?.focus(), 0);
        break;
      case 'Tab':
        e.preventDefault();
        commitEdit(false);  // move right
        setTimeout(() => gridRef.current?.focus(), 0);
        break;
      case 'Escape':
        cancelEdit();
        setTimeout(() => gridRef.current?.focus(), 0);
        break;
      default: break;
    }
  };

  // ── add rows / cols ──────────────────────────────────────────────────────────
  const addRow = () => {
    setData(d => { const n=[...d, Array(cols).fill('')]; persist(n); return n; });
    setRows(r => r + 1);
  };
  const addCol = () => {
    setData(d => { const n=d.map(r=>[...r,'']); persist(n); return n; });
    setCols(c => c + 1);
  };

  const downloadExcel = () => {
    const sheetData = Array.from({ length: rows }, (_, ri) =>
      Array.from({ length: cols }, (_, ci) => {
        const raw = data[ri]?.[ci] ?? '';
        if (!raw) return '';
        if (raw.startsWith('=')) {
          const v = getDisp(ri, ci);
          return isNaN(Number(v)) ? v : Number(v);
        }
        return isNaN(Number(raw)) ? raw : Number(raw);
      })
    );
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cricket Sheet');
    XLSX.writeFile(wb, 'cricket_sheet.xlsx');
  };

  // ── Add form entry to grid ─────────────────────────────────────────────────
  const HEADERS = ['First Name', 'Matches', 'Playing', 'Eating', 'Amount'];

  const addFromForm = () => {
    if (!form.name.trim()) return;
    setData(d => {
      let next = d.map(r => [...r]);
      // ensure at least 4 cols
      if (next[0].length < 4) next = next.map(r => { while(r.length<4) r.push(''); return r; });
      // write headers to row 0 if empty
      if (!next[0][0]) HEADERS.forEach((h,i) => { next[0][i] = h; });
      // find first empty data row (after header)
      let rowIdx = 1;
      while (rowIdx < next.length && next[rowIdx][0]) rowIdx++;
      if (rowIdx >= next.length) { next.push(Array(Math.max(cols,4)).fill('')); setRows(r=>r+1); }
      next[rowIdx][0] = form.name;
      next[rowIdx][1] = form.matches || '';
      next[rowIdx][2] = form.playing  || '';
      next[rowIdx][3] = form.eating   || '';
      next[rowIdx][4] = form.amount  || '';
      persist(next);
      return next;
    });
    setForm({ name: '', matches: '', playing: '', eating: '', amount: '' });
  };

  // ── Total amount from column D (index 3) ──────────────────────────────────
  const totalAmount = data.slice(1).reduce((sum, row) => {
    const v = parseFloat(row[4]);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  // ── Edit a row via form ────────────────────────────────────────────────────
  const editFromRow = (ri) => {
    const row = data[ri] || [];
    setForm({ name:row[0]||'', matches:row[1]||'', playing:row[2]||'', eating:row[3]||'', amount:row[4]||'' });
    setEditRowIdx(ri);
  };

  // ── Delete a row (clear all cells in that row) ────────────────────────────
  const deleteRow = (ri) => {
    if (!window.confirm(`Delete row ${ri}?`)) return;
    setData(d => {
      const next = d.map(r => [...r]);
      next[ri] = Array(next[ri].length).fill('');
      persist(next);
      return next;
    });
  };

  // ── Update the row being edited ───────────────────────────────────────────
  const updateRow = () => {
    if (editRowIdx === null) return;
    setData(d => {
      const next = d.map(r => [...r]);
      while (next[editRowIdx].length < 5) next[editRowIdx].push('');
      next[editRowIdx][0] = form.name;
      next[editRowIdx][1] = form.matches;
      next[editRowIdx][2] = form.playing;
      next[editRowIdx][3] = form.eating;
      next[editRowIdx][4] = form.amount;
      persist(next);
      return next;
    });
    setForm({ name:'', matches:'', playing:'', eating:'', amount:'' });
    setEditRowIdx(null);
  };

  const selRaw  = data[sel.r]?.[sel.c] ?? '';
  const selAddr = addr(sel.r, sel.c);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden',
      background:'#fff', fontFamily:"'Calibri','Segoe UI',Arial,sans-serif", fontSize:13 }}>

      {/* ══ Excel-style ribbon ══ */}
      <div style={{ background:'#217346', display:'flex', alignItems:'stretch',
        flexShrink:0, height:40, borderBottom:'2px solid #185230' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 14px',
          borderRight:'1px solid #185230' }}>
          <span style={{ fontSize:20 }}>🏏</span>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15, letterSpacing:0.5 }}>
            Cricket Sheet
          </span>
        </div>

        {/* Ribbon buttons */}
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'0 10px' }}>
          {[['➕ Row', addRow], ['➕ Col', addCol], ['📥 Download', downloadExcel]].map(([lbl, fn]) => (
            <button key={lbl} onClick={fn} style={{
              background: lbl.includes('Download') ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.3)',
              color:'#fff', padding:'4px 12px', borderRadius:3, cursor:'pointer',
              fontSize:12, fontWeight:600,
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.35)'}
            onMouseLeave={e=>e.currentTarget.style.background= lbl.includes('Download')?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.15)'}
            >{lbl}</button>
          ))}
        </div>

        {/* User + logout */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center',
          gap:8, padding:'0 12px', borderLeft:'1px solid #185230' }}>
          <span style={{ color:'#d5f0e0', fontSize:12 }}>👤 {user}</span>
          <button onClick={onLogout} style={{
            background:'rgba(0,0,0,0.25)', border:'none', color:'#fff',
            padding:'3px 10px', borderRadius:3, cursor:'pointer', fontSize:12
          }}>Logout</button>
        </div>
      </div>

      {/* ══ Entry Form Panel ══ */}
      <div style={{
        background:'#e8f5e9', borderBottom:'2px solid #217346',
        display:'flex', alignItems:'center', flexShrink:0,
        padding:'6px 10px', gap:8, flexWrap:'wrap',
      }}>
        <span style={{ fontWeight:700, color:'#1a5c38', fontSize:13, whiteSpace:'nowrap' }}>➕ Add Entry:</span>
        {[
          ['First Name','name','text','e.g. Rohit'],
          ['Matches','matches','text','e.g. 10'],
          ['Playing','playing','text','e.g. Batsman'],
          ['Eating','eating','text','e.g. Veg'],
          ['Amount','amount','number','0'],
        ].map(([label,key,type,ph]) => (
          <div key={key} style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <label style={{ fontSize:10, color:'#555', fontWeight:600 }}>{label}</label>
            <input type={type} value={form[key]}
              onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
              onKeyDown={e => e.key==='Enter' && addFromForm()}
              placeholder={ph}
              style={{ width:key==='name'?130:80, height:28, border:'1px solid #217346',
                borderRadius:4, padding:'0 8px', fontSize:13, outline:'none',
                background:'#fff', color:'#000000', fontWeight:500 }}
            />
          </div>
        ))}
        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
          <label style={{ fontSize:10, color:'#555', fontWeight:600 }}>Total Amount</label>
          <div style={{ height:28, padding:'0 14px', background:'#217346', color:'#fff',
            fontWeight:700, fontSize:14, borderRadius:4, display:'flex', alignItems:'center' }}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignSelf:'flex-end' }}>
          {editRowIdx !== null ? (
            <>
              <button onClick={updateRow}
                style={{ height:28, padding:'0 18px', background:'#e65100', border:'none',
                  color:'#fff', fontWeight:700, borderRadius:4, cursor:'pointer', fontSize:13 }}>
                💾 Update
              </button>
              <button onClick={() => { setEditRowIdx(null); setForm({ name:'', matches:'', playing:'', eating:'', amount:'' }); }}
                style={{ height:28, padding:'0 12px', background:'#757575', border:'none',
                  color:'#fff', fontWeight:700, borderRadius:4, cursor:'pointer', fontSize:13 }}>
                ✕ Cancel
              </button>
            </>
          ) : (
            <button onClick={addFromForm}
              style={{ height:28, padding:'0 18px', background:'#217346', border:'none',
                color:'#fff', fontWeight:700, borderRadius:4, cursor:'pointer', fontSize:13 }}
              onMouseEnter={e=>e.currentTarget.style.background='#1a5c38'}
              onMouseLeave={e=>e.currentTarget.style.background='#217346'}>✅ Add</button>
          )}
          <button onClick={downloadExcel}
            style={{ height:28, padding:'0 14px', background:'#1565c0', border:'none',
              color:'#fff', fontWeight:700, borderRadius:4, cursor:'pointer', fontSize:13 }}
            onMouseEnter={e=>e.currentTarget.style.background='#0d47a1'}
            onMouseLeave={e=>e.currentTarget.style.background='#1565c0'}>📥 Download</button>
        </div>
      </div>

      {/* ══ Formula bar (like Excel) ══ */}
      <div style={{ display:'flex', alignItems:'center', background:'#f3f3f3',
        borderBottom:'1px solid #d0d0d0', height:26, flexShrink:0 }}>

        {/* Name box */}
        <div style={{ width:60, textAlign:'center', fontWeight:700, fontSize:13,
          borderRight:'1px solid #d0d0d0', height:'100%',
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'#fff', color:'#1a1a1a' }}>
          {selAddr}
        </div>

        {/* fx icon */}
        <div style={{ padding:'0 8px', color:'#217346', fontStyle:'italic',
          fontWeight:700, fontSize:14, borderRight:'1px solid #d0d0d0',
          height:'100%', display:'flex', alignItems:'center' }}>
          fx
        </div>

        {/* Formula input */}
        <input
          value={edit?.r === sel.r && edit?.c === sel.c ? editVal : selRaw}
          onChange={e => { if (edit) setEditVal(e.target.value); }}
          onFocus={() => { if (!edit) startEdit(sel.r, sel.c, selRaw); }}
          onKeyDown={onCellKey}
          style={{
            flex:1, height:'100%', border:'none', outline:'none',
            background:'#fff', padding:'0 8px', fontSize:13,
            fontFamily:"'Courier New',monospace", color:'#1a1a1a',
          }}
        />
      </div>

      {/* ══ Grid ══ */}
      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey}
        style={{ flex:1, overflow:'auto', outline:'none', cursor:'default' }}>

        <table style={{ borderCollapse:'collapse', tableLayout:'fixed',
          minWidth: 50 + cols * COL_W }}>
          <colgroup>
            <col style={{ width:50 }} />
            {Array.from({length:cols}).map((_,ci)=>(
              <col key={ci} style={{ width:COL_W }} />
            ))}
          </colgroup>

          {/* Column headers */}
          <thead>
            <tr style={{ height:20 }}>
              {/* corner */}
              <th style={{ ...TH, background:'#f3f3f3', borderBottom:'2px solid #d0d0d0' }} />
              {Array.from({length:cols}).map((_,ci)=>(
                <th key={ci} style={{
                  ...TH,
                  background: sel.c===ci ? '#217346' : '#f3f3f3',
                  color:      sel.c===ci ? '#fff'    : '#444',
                  fontWeight: sel.c===ci ? 700 : 400,
                  borderBottom:'2px solid #d0d0d0',
                  userSelect:'none',
                }}>
                  {colName(ci)}
                </th>
              ))}
              {/* Actions column header */}
              <th style={{ ...TH, background:'#f3f3f3', borderBottom:'2px solid #d0d0d0',
                width:80, minWidth:80, color:'#666', fontSize:11 }}>Actions</th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {Array.from({length:rows}).map((_,ri)=>(
              <tr key={ri} style={{ height:ROW_H }}>

                {/* Row number */}
                <td style={{
                  ...ROW_NUM,
                  background: sel.r===ri ? '#217346' : '#f3f3f3',
                  color:      sel.r===ri ? '#fff'    : '#888',
                  fontWeight: sel.r===ri ? 700 : 400,
                }}>
                  {ri+1}
                </td>

                {/* Cells */}
                {Array.from({length:cols}).map((_,ci)=>{
                  const isSel  = sel.r===ri && sel.c===ci;
                  const isEdit = edit?.r===ri && edit?.c===ci;
                  const raw    = data[ri]?.[ci] ?? '';
                  const disp   = getDisp(ri, ci);
                  const isNum  = !isNaN(Number(disp)) && disp !== '';
                  const isErr  = String(disp).startsWith('#');
                  const isFml  = raw.startsWith('=');

                  return (
                    <td key={ci}
                      onClick={() => { if (!isEdit) { cancelEdit(); setSel({r:ri,c:ci}); } }}
                      onDoubleClick={() => startEdit(ri, ci, undefined)}
                      style={{
                        border: isSel
                          ? '2px solid #1565c0'
                          : '1px solid #e0e0e0',
                        borderCollapse: 'collapse',
                        padding:0, height:ROW_H, overflow:'hidden',
                        position:'relative',
                        background: isSel && !isEdit ? '#e8f0fe' : '#fff',
                        boxSizing:'border-box',
                      }}
                    >
                      {isEdit ? (
                        <input
                          ref={inputRef}
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => commitEdit(false)}
                          onKeyDown={onCellKey}
                          style={{
                            width:'100%', height:'100%',
                            border:'none', outline:'none',
                            padding:'0 3px', fontSize:13, margin:0,
                            background:'#fff', color:'#000',
                            fontFamily:"'Calibri','Segoe UI',Arial,sans-serif",
                            boxSizing:'border-box',
                          }}
                        />
                      ) : (
                        <div style={{
                          padding:'0 4px', height:'100%',
                          display:'flex', alignItems:'center',
                          justifyContent: isNum ? 'flex-end' : 'flex-start',
                          fontSize:13,
                          color: isErr ? '#d32f2f' : isFml ? '#1565c0' : '#1a1a1a',
                          overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                        }}>
                          {disp}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Actions column — show Edit/Delete for data rows (ri>0 and has name) */}
                <td style={{ border:'1px solid #e0e0e0', padding:'0 4px', width:80,
                  background: editRowIdx===ri ? '#fff8e1' : '#fafafa',
                  textAlign:'center', whiteSpace:'nowrap' }}>
                  {ri > 0 && data[ri]?.[0] ? (
                    <>
                      <button onClick={() => editFromRow(ri)}
                        title="Edit this row"
                        style={{ background: editRowIdx===ri?'#e65100':'#1565c0', border:'none',
                          color:'#fff', borderRadius:3, padding:'2px 6px',
                          cursor:'pointer', fontSize:11, marginRight:3 }}>
                        ✏️
                      </button>
                      <button onClick={() => deleteRow(ri)}
                        title="Delete this row"
                        style={{ background:'#d32f2f', border:'none',
                          color:'#fff', borderRadius:3, padding:'2px 6px',
                          cursor:'pointer', fontSize:11 }}>
                        🗑️
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div style={{ background:'#217346', color:'#d5f0e0', fontSize:11,
        padding:'2px 12px', flexShrink:0, display:'flex', gap:20,
        borderTop:'1px solid #185230' }}>
        <span>{rows}×{cols} grid</span>
        {selRaw && <span>Cell {selAddr}: {getDisp(sel.r, sel.c)}</span>}
        <span style={{ marginLeft:'auto' }}>Formulas: =SUM( =AVERAGE( =MIN( =MAX( =COUNT( =SQRT( =ROUND( =IF(</span>
      </div>

      {/* Floating calculator button */}
      <button onClick={() => setShowCalc(true)} title="Calculator"
        style={{
          position:'fixed', bottom:36, right:20,
          width:48, height:48, borderRadius:'50%',
          background:'#217346', border:'2px solid #2ea85a',
          color:'#fff', fontSize:20, cursor:'pointer',
          boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:400,
        }}>🧮</button>

      {showCalc && <RealCalculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}

// ── Base styles ───────────────────────────────────────────────────────────────
const TH = {
  textAlign:'center', fontSize:12, padding:'2px 4px',
  border:'1px solid #d0d0d0', position:'sticky', top:0, zIndex:10,
};
const ROW_NUM = {
  textAlign:'center', fontSize:11, padding:0,
  border:'1px solid #d0d0d0', position:'sticky', left:0, zIndex:5,
  userSelect:'none',
};
