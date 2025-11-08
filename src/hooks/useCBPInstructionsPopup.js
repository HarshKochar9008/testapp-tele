import { useState, useEffect } from 'react';

const useCBPInstructionsPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const STORAGE_KEY = 'cbp_instructions_popup_last_shown';
  const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  useEffect(() => {
    const checkAndShowPopup = () => {
      try {
        const lastShownTime = localStorage.getItem(STORAGE_KEY);
        const currentTime = Date.now();

        // If no previous time stored or more than 1 hour has passed
        if (!lastShownTime || (currentTime - parseInt(lastShownTime)) >= ONE_HOUR_MS) {
          //setShowPopup(true);
          // Update the last shown time
          localStorage.setItem(STORAGE_KEY, currentTime.toString());
        }
      } catch (error) {
        console.error('Error checking popup timing:', error);
        // If localStorage fails, show popup anyway
        //setShowPopup(true);
      }
    };

    // Small delay to ensure page is fully loaded
    const timer = setTimeout(checkAndShowPopup, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const closePopup = () => {
    setShowPopup(false);
  };

  const forceShowPopup = () => {
    setShowPopup(true);
  };

  const resetPopupTimer = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting popup timer:', error);
    }
  };

  return {
    showPopup,
    closePopup,
    forceShowPopup,
    resetPopupTimer
  };
};

export default useCBPInstructionsPopup;