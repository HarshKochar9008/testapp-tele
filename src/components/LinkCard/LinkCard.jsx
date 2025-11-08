import { useNavigate } from "react-router-dom";
import "./LinkCard.css";
import { useNotification } from '../../context/NotificationContext';
const LinkCard = ({ title, subtitle, icon, link, onClick }) => {
  const navigate = useNavigate();
  const { showComingSoon } = useNotification();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link === "#") {
      showComingSoon();
    } else {
      navigate(link);
    }
  };
  
  return (
    <div onClick={handleClick} className="link-card">
        {/* Left: icon + text */}
        <div className="link-content">
            <img src={icon} className="link-icon" alt="icon" />
            <div>
                <div className="link-title">{title}</div>
                <div className="link-subtitle">{subtitle}</div>
            </div>
        </div>

        {/* Right: arrow */}
        <img  src="/arrow_end.svg" alt="arrow" />
    </div>



  );
};

export default LinkCard;
