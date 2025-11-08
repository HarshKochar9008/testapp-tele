import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BuyTokenPopup.css';

const BuyTokenPopup = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleBuyNow = () => {
    navigate('/buy');
    onClose();
  };

  return (
    <div className="buy-token-popup-overlay" onClick={onClose}>
      <div className="buy-token-popup-content" onClick={e => e.stopPropagation()}>
        <button className="buy-token-popup-close" onClick={onClose}>×</button>
        <div className="buy-token-popup-main">
            <img src="/buy_token.png" alt="Buy Token" />
          <button className="buy-token-button" onClick={handleBuyNow}>
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyTokenPopup;
