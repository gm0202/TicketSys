import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const resp = await api.login({ email, password });
      login({
        id: resp.user.id,
        name: resp.user.name,
        email: resp.user.email,
        role: resp.user.role,
        token: resp.token,
      });
      navigate(resp.user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="hero" style={{ marginBottom: 16 }}>
        <h1>Login</h1>
        <p>Sign in as user or admin (mock auth stored locally).</p>
      </div>
      <form className="card grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <label className="grid" style={{ gap: 6 }}>
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="grid" style={{ gap: 6 }}>
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="status-pill failed">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}

