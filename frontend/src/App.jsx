import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cricket_token');
    const savedUser = localStorage.getItem('cricket_user');
    if (token && savedUser) setUser(savedUser);
    setChecking(false);
  }, []);

  const handleLogin = (username) => setUser(username);

  const handleLogout = () => {
    localStorage.removeItem('cricket_token');
    localStorage.removeItem('cricket_user');
    setUser(null);
  };

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 40 }}>🏏</div>
    </div>
  );

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />;
}
