import React, { useState } from "react";
import "./style_registration.css";
import { useNavigate } from "react-router-dom";
import {useAuth} from "../store/auth.jsx";

const RegistrationForm = () => {
  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const navigate = useNavigate();
  const {storeTokenInLS} = useAuth();
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formValues.username.trim()) {
      newErrors.username = "Username is required.";
    }

    if (!formValues.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      newErrors.email = "Enter a valid email.";
    }

    if (!formValues.password) {
      newErrors.password = "Password is required.";
    } else if (formValues.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!formValues.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formValues.password !== formValues.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!formValues.terms) {
      newErrors.terms = "You must accept the terms.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      if(response.ok){

        const res_data = await response.json();
        console.log("response from server", res_data);

        //store the token in local storage
        storeTokenInLS(res_data.accessToken);
        // localStorage.setItem("token", res_data);

        setFormValues({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          terms: false,
        })
        navigate("/login");
      }

      console.log(await response.json());
      alert("Registered successfully!");
    } catch (error) {
      console.log("register error:", error);
    }
  };

  return (
    <div className="container">
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
            value={formValues.username}
            onChange={handleChange}
            required
          />
          <span className="error">{errors.username}</span>
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
            value={formValues.email}
            onChange={handleChange}
            required
          />
          <span className="error">{errors.email}</span>
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Minimum 8 characters"
            value={formValues.password}
            onChange={handleChange}
            minLength={8}
            required
          />
          <span className="error">{errors.password}</span>
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter your password"
            value={formValues.confirmPassword}
            onChange={handleChange}
            required
          />
          <span className="error">{errors.confirmPassword}</span>
        </div>

        {/* Terms */}
        <div className="form-group inline">
          <label className="checkbox">
            <input
              type="checkbox"
              id="terms"
              name="terms"
              checked={formValues.terms}
              onChange={handleChange}
              required
            />
            <span>I agree to the terms and conditions</span>
          </label>
          <span className="error">{errors.terms}</span>
        </div>

        <button type="submit" className="btn-primary">
          Create account
        </button>

        <p className="footer-text">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </form>
    </div>
  );
};

export default RegistrationForm;
