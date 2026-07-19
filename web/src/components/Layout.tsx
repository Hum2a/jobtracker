import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "./Logo";

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          <Logo />
          <span className="brand-name">Docket</span>
        </NavLink>
        <nav className="nav-pill" aria-label="Primary">
          <NavLink to="/" end>
            Board
          </NavLink>
          <NavLink to="/list">List</NavLink>
          <NavLink to="/stats">Stats</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
