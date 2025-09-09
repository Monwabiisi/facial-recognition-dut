import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, adminKey }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Login failed');
        return;
      }
      const data = await res.json();
      if (data.token) localStorage.setItem('token', data.token);
      // Redirect based on admin flag
      if (data.user?.isAdmin) navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError('Network error');
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Left: form card */}
      <div className="card p-8">
        <h1 className="text-2xl font-bold mb-1">Welcome Back</h1>
        <p className="text-neutral-500 mb-6">Sign in to access your dashboard.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="you@domain.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Admin PIN (optional)</label>
            <input className="input" type="password" placeholder="Admin PIN" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button className="btn-primary w-full" type="submit">Sign in</button>
        </form>

        <div className="text-sm text-neutral-500 mt-4">
          No account? <Link className="text-brand-600 underline" to="/camera">Try Camera</Link>
        </div>
      </div>

      {/* Right: illustration placeholder (kept small so no giant @) */}
      <div className="hidden md:block">
        <div className="card h-[420px] flex items-center justify-center">
          <span className="text-neutral-400">Illustration / Brand block</span>
        </div>
      </div>
    </div>
  );
}
