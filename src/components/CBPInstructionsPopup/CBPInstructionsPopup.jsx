import React from 'react';
import './CBPInstructionsPopup.css';

const CBPInstructionsPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="cbp-popup-overlay" onClick={onClose}>
      <div className="cbp-popup-content" onClick={e => e.stopPropagation()}>
        <button className="cbp-popup-close" onClick={onClose}>×</button>
        
        <div className="cbp-popup-header">
          <div className="cbp-popup-icon">
            <img src="/play.svg" alt="CBP Icon" />
          </div>
          <h2 className="cbp-popup-title">How to Check Your CBP Viral Circle</h2>
          <p className="cbp-popup-subtitle">imported from Phase 1</p>
        </div>

        <div className="cbp-popup-body">
          <div className="cbp-step">
            <div className="cbp-step-number">1</div>
            <div className="cbp-step-content">
              <p className="cbp-step-text">Open the CBP Mini App.</p>
            </div>
          </div>

          <div className="cbp-step">
            <div className="cbp-step-number">2</div>
            <div className="cbp-step-content">
              <p className="cbp-step-text">Tap <span className="cbp-highlight">PVC</span> in the bottom menu</p>
              <p className="cbp-step-subtext">👉 Or select My CBP Viral Circle from the Home screen.</p>
            </div>
          </div>

          <div className="cbp-step">
            <div className="cbp-step-number">3</div>
            <div className="cbp-step-content">
              <p className="cbp-step-text">View all your referrals listed under My CBP Viral Circle.</p>
            </div>
          </div>

          <div className="cbp-step">
            <div className="cbp-step-number">4</div>
            <div className="cbp-step-content">
              <p className="cbp-step-text">Tap on any referral's name to see their referrals too.</p>
            </div>
          </div>

          <div className="cbp-popup-footer">
            <div className="cbp-footer-text">
              <p className="cbp-footer-main">Now with your referral link, directly add your community to your CBP Community..</p>
              <div className="cbp-footer-badge">
                <span className="cbp-badge-text">CBP Registrations live!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CBPInstructionsPopup;