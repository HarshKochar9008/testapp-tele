import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./BottomNavbar.css";

export default function BottomNavbar({ fuelPercentage, spinWheelTaskId }) {
  const [fuelProgress, setFuelProgress] = useState(fuelPercentage);

  useEffect(() => {
    setFuelProgress(fuelPercentage);
  }, [fuelPercentage]);

  // Function to determine color based on fuel %
  const getFuelColor = () => {
    if (fuelProgress > 60) return "#5BFF20";
    if (fuelProgress > 30) return "#FFD700";
    return "#FF3333"; 
};


  return (
    <nav className="bottom-navbar">
      <NavLink to="/" end className="nav-item">
        {({ isActive }) => (
          <>
            <img src={isActive ? "/home_active.svg" : "/home.svg"} alt="Home" />
            <span className={isActive ? "active-text" : ""}>Home</span>
          </>
        )}
      </NavLink>

      <NavLink to={`/leaderboard`} className="nav-item">
        {({ isActive }) => (
          <>
            <img src={isActive ? "/leaderboard_active.svg" : "/leaderboard.svg"} alt="Leaderboard" />
            <span className={isActive ? "active-text" : ""}>Leaders</span>
          </>
        )}
      </NavLink>

      {/* Game Button with Fuel Progress */}
      <div className="game-container">
        <div 
          className="progress-ring"
          style={{
            "--fuel": `${fuelProgress}%`,
            "--fuel-color": getFuelColor(),
          }}
        >
          <NavLink to="/tap" className="game-button">
            <img src="/gaming.svg" alt="Game" />
          </NavLink>
        </div>
      </div>

      <NavLink to="/invite" className="nav-item">
        {({ isActive }) => (
          <>
            <img src={isActive ? "/invite_active.svg" : "/invite.svg"} alt="Invite" />
            <span className={isActive ? "active-text" : ""}>Friends</span>
          </>
        )}
      </NavLink>

      <NavLink to="/tasks" className="nav-item">
        {({ isActive }) => (
          <>
            <img src={isActive ? "/tasks_active.svg" : "/tasks.svg"} alt="Tasks" />
            <span className={isActive ? "active-text" : ""}>Earn</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
