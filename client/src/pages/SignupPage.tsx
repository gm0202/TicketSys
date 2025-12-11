import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Name, email, and password are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const resp = await api.signup({ name, email, password, role });
      login({
        id: resp.user.id,
        name: resp.user.name,
        email: resp.user.email,
        role: resp.user.role,
        token: resp.token,
      });
      navigate(resp.user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="hero" style={{ marginBottom: 16 }}>
        <h1>Create account</h1>
        <p>Choose a role (user/admin). Stored locally for now.</p>
      </div>
      <form className="card grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
        <label className="grid" style={{ gap: 6 }}>
          <span className="label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
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
          <span className="label">Role</span>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="grid" style={{ gap: 6 }}>
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="status-pill failed">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
    </div>
  );
}

