import Navbar from "../components/navbar.jsx";
import Sidebar from "../components/sidebar.jsx";

const AppLayout = ({ children, shrink, onToggle }) => {
  return (
    <>
      <Navbar shrink={shrink} />
      <Sidebar shrink={shrink} onToggle={onToggle} />
      <div style={{ transition: "all 0.3s ease" }}>
        {children}
      </div>
    </>
  );
};

export default AppLayout;
