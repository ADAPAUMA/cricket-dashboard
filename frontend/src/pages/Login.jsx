import { useState } from 'react';
import API from '../utils/api';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const res = await API.post('/login', form);
      localStorage.setItem('cricket_token', res.data.token);
      localStorage.setItem('cricket_user', res.data.username);
      onLogin(res.data.username);
    } catch {
      setErr('❌ Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
      backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(26,122,26,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 20%, rgba(245,197,24,0.08) 0%, transparent 40%)'
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 56 }}>🏏</div>
          <h1 style={{
            fontFamily: 'Rajdhani', fontSize: 32, fontWeight: 700,
            color: 'var(--gold)', letterSpacing: 2, marginTop: 8
          }}>CRICKET MANAGER</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--text)' }}>
            Sign In
          </h2>

          {err && (
            <div style={{
              background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)',
              color: 'var(--red)', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, marginBottom: 16
            }}>{err}</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text" placeholder="Enter username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password" placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handle(e)}
              />
            </div>
            <button className="btn btn-primary" onClick={handle} disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15, marginTop: 4 }}>
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </div>

          <div style={{
            marginTop: 20, padding: '12px', background: 'var(--bg3)',
            borderRadius: 8, fontSize: 12, color: 'var(--text2)', textAlign: 'center'
          }}>
            Default: <strong style={{ color: 'var(--text)' }}>admin</strong> / <strong style={{ color: 'var(--text)' }}>cricket@123</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
