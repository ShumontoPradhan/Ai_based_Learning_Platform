import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authContext.jsx";
import BrandLoader from "../components/brand/BrandLoader.jsx";

const LogOut = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    const t = setTimeout(() => navigate("/login", { replace: true }), 400);
    return () => clearTimeout(t);
  }, [logout, navigate]);

  return <BrandLoader message="Signed out" />;
};

export default LogOut;
