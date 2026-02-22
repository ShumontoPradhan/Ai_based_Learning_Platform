import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./authContext.jsx";
import AppLayout from "../layouts/AppLayout.jsx";
import { useState } from "react";

const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarShrink, setSidebarShrink] = useState(false);

  if (loading) return <div>loading...</div>;

  return isAuthenticated ? (
    <AppLayout
      shrink={sidebarShrink}
      onToggle={() => setSidebarShrink(!sidebarShrink)}
    >
      <Outlet />
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;
