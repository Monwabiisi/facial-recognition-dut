import React from "react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Left: form card */}
      <div className="card p-8">
        <h1 className="text-2xl font-bold mb-1">Welcome Back</h1>
        <p className="text-neutral-500 mb-6">Sign in to access your dashboard.</p>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="you@domain.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full">Sign in</button>
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
