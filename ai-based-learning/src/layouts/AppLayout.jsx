import React from "react";
import Navbar from "../components/navbar.jsx";
import Sidebar from "../components/sidebar.jsx";

const AppLayout = ({ children, shrink }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <Navbar shrink={shrink} onToggle={toggleSidebar} />
      <Sidebar
        shrink={shrink}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />
      <div style={{ transition: "all 0.3s ease" }}>
        {children}
      </div>
    </>
  );
};

export default AppLayout;