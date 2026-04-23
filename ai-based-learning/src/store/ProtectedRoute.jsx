import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./authContext.jsx";
import AppLayout from "../layouts/AppLayout.jsx";
import BrandLoader from "../components/brand/BrandLoader.jsx";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <BrandLoader message="Checking your session" />;
  }

  return isAuthenticated ? (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;
