
import { createContext, useContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [isAuthentcated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check token on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const storeTokenInLS = (accessToken) => {
    localStorage.setItem("token", accessToken);
    setIsAuthenticated(true); // 🔑 THIS FIXES YOUR ISSUE
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const updateUser = (newUserData) => {   // ✅ MUST EXIST
    setUser(newUserData);
    localStorage.setItem("user", JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        isAuthentcated,
        loading,
        storeTokenInLS,
        login,
        logout,
        // checkAuthStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const authContextValue = useContext(AuthContext);
  if (!authContextValue) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return authContextValue;
};

