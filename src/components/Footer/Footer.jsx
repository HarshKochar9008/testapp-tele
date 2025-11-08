import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./footer.css";
import { useNotification } from '../../context/NotificationContext';

export default function Footer() {
  const { showComingSoon, showNotification } = useNotification();
  const location = useLocation();

  // Map of buttons to their corresponding active SVG files
  const buttonActiveSVGs = {
    home: "/active/home-active.svg",
    pvc: "/active/my-pvc-active.svg", 
    earnings: "/active/Earning-active.svg",
    plan: "/active/dashboard-active.svg"
  };

  // Map of routes to their corresponding button names
  const routeToButton = {
    "/": "home",
    "/pvc": "pvc",
    "/share-and-earn": "share",
    "/earnings": "earnings",
    "/plan": "plan"
  };

  const getCurrentButton = () => {
    return routeToButton[location.pathname];
  };
  const currentButton = getCurrentButton();

  return (
    <footer className="footer-container">
      {/* Home Icon */}
      <NavLink to="/" className="footer-item">
        {({ isActive }) => (
          <img 
            src={currentButton === 'home' ? buttonActiveSVGs.home : "/home_nav.svg"}
            alt="Home"
          />
        )}
      </NavLink>

      {/* Explore Icon */}
      <NavLink to="/pvc" className="footer-item">
        {({ isActive }) => (
          <img 
            src={currentButton === 'pvc' ? buttonActiveSVGs.pvc : "/my_pvc.svg"}
            alt="Explore"
          />
        )}
      </NavLink>

      {/* Center Game Button with glowing ring */}
      <div className="game-container">
          <NavLink to="/share-and-earn" className="game-button">
            <img 
              src="/spotlight_nav.svg" 
              alt="Share & Earn" 
            />
          </NavLink>
        </div>

      {/* Portfolio Icon */}
      <NavLink to="/earnings" className="footer-item">
        {({ isActive }) => (
          <img 
            src={currentButton === 'earnings' ? buttonActiveSVGs.earnings : "/Earning.svg"}
            alt="Earnings"
          />
        )}
      </NavLink>

      {/* Profile Icon */}
      <NavLink to="/plan" className="footer-item">
        {({ isActive }) => (
          <img 
            src={currentButton === 'plan' ? buttonActiveSVGs.plan : "/Dashboard.svg"}
            alt="Profile"
          />
        )}
      </NavLink>
    </footer>
  );
}