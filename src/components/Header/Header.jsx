import React, { useState, useEffect, useRef } from "react";
import "./Header.css";

export default function Header({openPaidDrawer, unreadCount, subUsers}) {
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (subUsers && subUsers.length > 0) {
      setSelectedUser((current) => current ?? subUsers[0]);
    } else {
      setSelectedUser(null);
    }
  }, [subUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) {
        return;
      }
      setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const toggleDropdown = () => {
    if (!subUsers || subUsers.length === 0) {
      return;
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const handleDropDownClick = (user) => {
    setSelectedUser(user);
    setIsDropdownOpen(false);

    if (user?.telegram_id) {
      console.log("Selected sub user telegram_id:", user.telegram_id);
    } else {
      console.log("Selected sub user has no telegram_id");
    }
  };

  return (
    <header className="header">
      <div className="logo-section">
        <img src="/logo.svg" alt="EONX Logo" className="logo-img" />
      </div>

      <div className="header-right">
        {subUsers?.length > 0 ? (
          <div
            className={`subuser-dropdown ${isDropdownOpen ? "open" : ""}`}
            ref={dropdownRef}
          >
            <button
              type="button"
              className="subuser-dropdown-trigger"
              onClick={toggleDropdown}
            >
              <span className="subuser-dropdown-label">
                {selectedUser?.telegram_username || "Select sub user"}
              </span>
              <span className="subuser-dropdown-arrow" />
            </button>

            {isDropdownOpen && (
              <ul className="subuser-dropdown-menu">
                {subUsers.map((user) => (
                  <li key={user.telegram_id || user.telegram_username}>
                    <button
                      type="button"
                      className="subuser-dropdown-item"
                      onClick={() => handleDropDownClick(user)}
                    >
                      {user.telegram_username || "Unnamed user"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="subuser-dropdown empty">
            
          </div>
        )}
      </div>

     
    </header>

    
  );
}