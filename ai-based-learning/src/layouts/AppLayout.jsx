import React, { useState } from "react";
import Navbar from "../components/navbar.jsx";
import Sidebar from "../components/sidebar.jsx";

const AppLayout = ({ children }) => {
  const [shrink, setShrink] = useState(false);

  const toggleSidebar = () => {
    setShrink(prev => !prev);
  };

  return (
    <>
      <Navbar shrink={shrink} onToggle={toggleSidebar} />
      <Sidebar shrink={shrink} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div 
        style={{
          marginLeft: shrink ? "80px" : "240px",
          transition: "margin-left 0.3s ease",
          paddingTop: "70px"
        }}
      >
        {children}
      </div>
    </>
  );
};

export default AppLayout;