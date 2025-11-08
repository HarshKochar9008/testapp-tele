import React from 'react';
import './TelegramChannelPopup.css';

const TelegramChannelPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleJoinChannel = () => {
    window.open('https://t.me/eonxaiofficial', '_blank');
  };

  return (
    <div className="telegram-popup-overlay" onClick={onClose}>
      <div className="telegram-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="telegram-popup-icon">
          <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#00FF00" opacity="0.2"/>
            <path d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4ZM33.526 17.126L31.492 30.758C31.492 30.758 31.102 31.982 30.008 31.768L18.996 25.59L18.996 25.582L31.492 17.126C31.492 17.126 32.868 16.106 33.526 17.126Z" fill="#00FF00"/>
          </svg>
        </div>
        
        <h2 className="telegram-popup-title">Join Our Channel</h2>
        
        <p className="telegram-popup-description">
          Stay updated with the latest announcements and exclusive updates from EonX AI!
        </p>

        <div className="telegram-popup-actions">
          <button 
            className="telegram-popup-join-btn" 
            onClick={handleJoinChannel}
          >
            Join Channel
          </button>
          <button 
            className="telegram-popup-close-btn" 
            onClick={onClose}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramChannelPopup;
