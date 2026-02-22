import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/authContext";
import authService from "../services/auth_service";
import toast from "react-hot-toast";
import "./style_login.css";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // const [focusedField, setFocusedField] = useState("");

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
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[length:16px_16px] opacity-40 pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-md px-6">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/50 p-10 transition-all duration-300 hover:shadow-emerald-200/40">
          
          <form className="form-card text-center" onSubmit={handleSubmit}>
            <h2>Welcome back!!</h2>
            <p className="subtitle">Log in to continue</p>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="loginEmail">Email address</label>
              <input
                type="email"
                id="loginEmail"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200/60">
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  to="/registration"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
                >
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By logging in, you agree to our{" "}
          <Link
            to="/terms"
            className="text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
          >
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
