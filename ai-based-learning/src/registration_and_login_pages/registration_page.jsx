import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/auth_service";
import toast from "react-hot-toast";
import "./style_login.css";

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.terms) {
      toast.error("Please accept the terms to continue");
      return;
    }
    setLoading(true);
    try {
      await authService.register(
        formData.username,
        formData.email,
        formData.password,
        formData.terms
      );
      toast.success("Account created. Sign in with your email.");
      navigate("/login");
    } catch (error) {
      const msg =
        error?.response?.data?.message || error.message || "Registration failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.3]"
        style={{ maskImage: "radial-gradient(ellipse 80% 50% at 50% 20%, black, transparent)" }}
      />
      <div className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute left-10 bottom-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="relative z-[1] w-full max-w-md px-5">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-extrabold tracking-widest text-white shadow-2xl shadow-fuchsia-500/30">
            LL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Join LearnLab</h1>
          <p className="mt-1 text-sm text-slate-400">Create your account to get started</p>
        </div>

        <div className="card-elevated border-slate-200/80 p-8 sm:p-10">
          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <h2>Create account</h2>
            <p className="subtitle">Use a username you will recognize in the app</p>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                placeholder="e.g. alex_study"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group mb-4">
              <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="terms"
                  checked={formData.terms}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>I agree to the terms and to use this app for learning purposes.</span>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-violet-700">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
