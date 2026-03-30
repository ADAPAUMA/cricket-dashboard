import { useState, useEffect } from 'react';

const EMPTY = {
  name: '', phone: '', team: 'Team A', isFavorite: false,
  subscriptionAmount: 0, subscriptionPaid: false,
  matchFees: 0, matchFeesPaid: false,
  wins: 0, losses: 0, notes: ''
};

export default function MemberForm({ member, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (member) setForm({ ...EMPTY, ...member });
    else setForm(EMPTY);
  }, [member]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return alert('Member name required!');
    onSave(form);
  };

  const isEdit = !!member?._id;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? '✏️ Edit Member' : '➕ Add Member'}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="form-grid">
          {/* Name */}
          <div className="form-group full">
            <label>Member Name *</label>
            <input placeholder="Full name" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>Phone Number</label>
            <input placeholder="10-digit number" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>

          {/* Team */}
          <div className="form-group">
            <label>Team</label>
            <select value={form.team} onChange={e => set('team', e.target.value)}>
              <option>Team A</option>
              <option>Team B</option>
            </select>
          </div>

          {/* Subscription */}
          <div className="form-group">
            <label>Subscription Amount (₹)</label>
            <input type="number" min="0" value={form.subscriptionAmount}
              onChange={e => set('subscriptionAmount', Number(e.target.value))} />
          </div>

          {/* Sub Paid */}
          <div className="form-group" style={{ justifyContent: 'flex-end', paddingTop: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <label className="toggle">
                <input type="checkbox" checked={form.subscriptionPaid}
                  onChange={e => set('subscriptionPaid', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              Subscription Paid
            </label>
          </div>

          {/* Match Fees */}
          <div className="form-group">
            <label>Match Fees (₹)</label>
            <input type="number" min="0" value={form.matchFees}
              onChange={e => set('matchFees', Number(e.target.value))} />
          </div>

          {/* Match Fees Paid */}
          <div className="form-group" style={{ justifyContent: 'flex-end', paddingTop: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <label className="toggle">
                <input type="checkbox" checked={form.matchFeesPaid}
                  onChange={e => set('matchFeesPaid', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              Match Fees Paid
            </label>
          </div>

          {/* Wins */}
          <div className="form-group">
            <label>🏆 Wins</label>
            <input type="number" min="0" value={form.wins}
              onChange={e => set('wins', Number(e.target.value))} />
          </div>

          {/* Losses */}
          <div className="form-group">
            <label>❌ Losses</label>
            <input type="number" min="0" value={form.losses}
              onChange={e => set('losses', Number(e.target.value))} />
          </div>

          {/* Favorite */}
          <div className="form-group full">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <label className="toggle">
                <input type="checkbox" checked={form.isFavorite}
                  onChange={e => set('isFavorite', e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              ⭐ Mark as Favorite Player
            </label>
          </div>

          {/* Notes */}
          <div className="form-group full">
            <label>Notes / Terms</label>
            <textarea rows={3} placeholder="Any notes, special terms, conditions..."
              value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {isEdit ? '💾 Update' : '✅ Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
