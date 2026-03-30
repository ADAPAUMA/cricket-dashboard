import { useState } from 'react';

export default function Calculator({ members, onClose }) {
  const [subRate, setSubRate] = useState(500);
  const [matchFeeRate, setMatchFeeRate] = useState(200);
  const [filterTeam, setFilterTeam] = useState('All');

  const filtered = filterTeam === 'All' ? members : members.filter(m => m.team === filterTeam);

  const totalSub = filtered.reduce((s, m) => s + m.subscriptionAmount, 0);
  const collectedSub = filtered.filter(m => m.subscriptionPaid).reduce((s, m) => s + m.subscriptionAmount, 0);
  const pendingSub = totalSub - collectedSub;

  const totalFees = filtered.reduce((s, m) => s + m.matchFees, 0);
  const collectedFees = filtered.filter(m => m.matchFeesPaid).reduce((s, m) => s + m.matchFees, 0);
  const pendingFees = totalFees - collectedFees;

  const totalWins = filtered.reduce((s, m) => s + m.wins, 0);
  const totalLosses = filtered.reduce((s, m) => s + m.losses, 0);
  const winRate = totalWins + totalLosses > 0
    ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0;

  // Quick calculator
  const quickSub = filtered.length * subRate;
  const quickFees = filtered.length * matchFeeRate;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">🧮 Calculator & Summary</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['All', 'Team A', 'Team B'].map(t => (
            <button key={t}
              className={`btn ${filterTeam === t ? 'btn-gold' : 'btn-outline'}`}
              onClick={() => setFilterTeam(t)} style={{ flex: 1 }}>
              {t === 'All' ? '🏏 All Teams' : t === 'Team A' ? '🟢 Team A' : '🟡 Team B'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Members', value: filtered.length, icon: '👥' },
            { label: 'Favorites', value: filtered.filter(m => m.isFavorite).length, icon: '⭐' },
            { label: 'Total Wins', value: totalWins, icon: '🏆' },
            { label: 'Total Losses', value: totalLosses, icon: '❌' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Win rate */}
        <div style={{
          background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px',
          border: '1px solid var(--border)', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Win Rate</div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 8 }}>
              <div style={{
                width: `${winRate}%`, height: '100%', borderRadius: 4,
                background: winRate >= 60 ? 'var(--green-light)' : winRate >= 40 ? 'var(--gold)' : 'var(--red)',
                transition: 'width 0.5s'
              }} />
            </div>
          </div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--gold)' }}>
            {winRate}%
          </div>
        </div>

        {/* Financials */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            💰 Financial Summary
          </div>
          <div className="calc-result">
            <div className="calc-row">
              <span>Subscription — Total</span>
              <span className="amount-gold">₹{totalSub.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Subscription — Collected</span>
              <span className="amount-green">₹{collectedSub.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Subscription — Pending</span>
              <span className="amount-red">₹{pendingSub.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Match Fees — Total</span>
              <span className="amount-gold">₹{totalFees.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Match Fees — Collected</span>
              <span className="amount-green">₹{collectedFees.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Match Fees — Pending</span>
              <span className="amount-red">₹{pendingFees.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Grand Total Pending</span>
              <span>₹{(pendingSub + pendingFees).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Quick Calculator */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            ⚡ Quick Calculator — if all members pay same amount
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="form-group">
              <label>Per member Subscription (₹)</label>
              <input type="number" value={subRate} onChange={e => setSubRate(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Per member Match Fee (₹)</label>
              <input type="number" value={matchFeeRate} onChange={e => setMatchFeeRate(Number(e.target.value))} />
            </div>
          </div>
          <div className="calc-result">
            <div className="calc-row">
              <span>{filtered.length} members × ₹{subRate} subscription</span>
              <span className="amount-green">₹{quickSub.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>{filtered.length} members × ₹{matchFeeRate} match fees</span>
              <span className="amount-green">₹{quickFees.toLocaleString('en-IN')}</span>
            </div>
            <div className="calc-row">
              <span>Expected Total Collection</span>
              <span>₹{(quickSub + quickFees).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: 20 }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
