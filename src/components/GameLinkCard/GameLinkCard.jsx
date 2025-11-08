import "./GameLinkCard.css";
import { useNavigate } from "react-router-dom";

const GameLinkCard = ({ icon, title, subtitle, buttonText, onClick }) => {
    const navigate = useNavigate();
    
    return (
        <div className="game-card">
        {/* Left Icon and Text */}
        <div className="game-content">
            <div className="game-icon">
            <img src={icon} alt="icon" />
            </div>
            <div className="game-text">
            <div className="game-title">{title}</div>
            <div className="game-subtitle">{subtitle}</div>
            </div>
        </div>

        {/* Right Button */}
        <button className="neon-glass-btn" onClick={onClick}>
            {buttonText}
        </button>
        </div>
    );
};

export default GameLinkCard;