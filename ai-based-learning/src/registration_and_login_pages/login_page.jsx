import React, { useState } from "react";
import "./style_login.css";
const URL = "http://localhost:5000/api/auth/login"
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

const LoginForm = () => {
  const [values, setValues] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const navigate = useNavigate();
  const {storeTokenInLS} = useAuth();
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!values.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      newErrors.email = "Enter a valid email.";
    }

    if (!values.password) {
      newErrors.password = "Password is required.";
    } else if (values.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;
    
    try {
      const response = await fetch(URL, {
        method: "POST",
        headers: {
          'Content-Type': "application/json"
        },
        body: JSON.stringify(values),
      })

      const res_data = await response.json();
      console.log("Response:",res_data)
      if(response.ok){
        alert("LoggedIn Successfully!!")
        
        //store the token in local storage
        // localStorage.setItem("token", res_data.accessToken); 
        storeTokenInLS(res_data.accessToken);

        setValues({
          email: "",
          password: "",
          remember: false,
        })
        navigate("/home");
      }else{
        alert("Invalid Credentials!!")
        console.log("Invalid Credentials!!");
      }
      // console.log(await response.json());

    } catch (error) {
      console.log("login error:", error);
    }

    alert("Logged in! (Wire this to your backend auth)");
  };

  return (
    <div className="container">
      <form className="form-card" noValidate onSubmit={handleSubmit}>
        <h2>Welcome back</h2>
        <p className="subtitle">Log in to continue</p>

        <div className="form-group">
          <label htmlFor="loginEmail">Email address</label>
          <input
            type="email"
            id="loginEmail"
            name="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={handleChange}
            required
          />
          <span className="error">{errors.email}</span>
        </div>

        <div className="form-group">
          <label htmlFor="loginPassword">Password</label>
          <input
            type="password"
            id="loginPassword"
            name="password"
            placeholder="Enter your password"
            value={values.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
          <span className="error">{errors.password}</span>
        </div>

        <div className="form-group inline" style={{ justifyContent: "space-between" }}>
          <label className="checkbox">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={values.remember}
              onChange={handleChange}
            />
            <span>Remember me</span>
          </label>
          <a href="/forgot-password" className="footer-text" style={{ margin: 0 }}>
            Forgot password?
          </a>
        </div>

        <button type="submit" className="btn-primary">
          Log in
        </button>

        <p className="footer-text">
          Don&apos;t have an account? <a href="/register">Create one</a>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
