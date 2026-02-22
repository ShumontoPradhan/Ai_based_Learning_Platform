import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authService from "../services/auth_service";
import toast from "react-hot-toast";
import "./style_registration.css";

const RegistrationForm = () => {
  // 1. Consolidated state to match your inputs
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false, // Initialize terms as false
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); // For field-specific errors

  const navigate = useNavigate();

  // 2. Handle input changes correctly
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.terms) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      // 3. Pass ALL required fields, including terms
      await authService.register(
        formData.username,
        formData.email,
        formData.password,
        formData.terms // <--- This was missing
      );
      
      toast.success("Registration successful! Please log in.");
      navigate("/login");
    } catch (error) {
      const msg = error?.response?.data?.message || error.message || "Registration failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{marginTop: "20px"}}>
      <form className="form-card" noValidate onSubmit={handleSubmit}>
        <h2>Create an account</h2>
        <p className="subtitle">Sign up to get started</p>

        {/* Username */}
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Enter username"
            value={formData.username} 
            onChange={handleChange}
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Minimum 8 characters"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>

        {/* Terms - Ensure name="terms" matches state */}
        <div className="form-group inline">
          <label className="checkbox">
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
            />
            <span>I agree to the terms and conditions</span>
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
};

export default RegistrationForm;
