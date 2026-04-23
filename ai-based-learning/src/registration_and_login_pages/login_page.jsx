import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authContext.jsx";
import authService from "../services/auth_service";
import toast from "react-hot-toast";
import "./style_login.css";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      await login(response.user, response.accessToken, response.refreshToken);
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.35]"
        style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)" }}
      />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />

      <div className="relative z-[1] w-full max-w-md px-5">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-extrabold tracking-widest text-white shadow-2xl shadow-indigo-500/40">
            LL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">LearnLab</h1>
          <p className="mt-1 text-sm text-slate-400">AI-powered study workspace</p>
        </div>

        <div className="card-elevated border-slate-200/80 p-9 sm:p-10">
          <form className="form-card text-center" onSubmit={handleSubmit}>
            <h2>Welcome back</h2>
            <p className="subtitle">Sign in to continue</p>

            <div className="form-group">
              <label htmlFor="loginEmail">Email</label>
              <input
                type="email"
                id="loginEmail"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="mt-8 border-t border-slate-200/80 pt-6">
              <p className="text-sm text-slate-600">
                New here?{" "}
                <Link
                  to="/registration"
                  className="font-semibold text-indigo-600 transition hover:text-violet-700"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing you agree to fair use of the platform for learning.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
