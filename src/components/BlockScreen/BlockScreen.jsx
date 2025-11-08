import React, { useState, useEffect } from 'react';
import './BlockScreen.css';
import { color } from 'd3';

const BlockScreen = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const updateCountdown = () => {
      // Get current time in UK timezone
      const nowUK = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
      const currentUKTime = new Date(nowUK);
      
      // Target date: October 12, 2025, 11:59:00 PM UK time
      const targetUKDate = new Date('2025-10-13T17:00:00');
      const targetUKTime = new Date(targetUKDate.toLocaleString('en-US', { timeZone: 'Europe/London' }));
      
      // Calculate difference in milliseconds
      const difference = new Date('2025-10-13T17:00:00').getTime() - currentUKTime.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="block-screen">
      <div className="block-screen-content">
        <div className="block-screen-logo">
          <img src="/logo.svg" alt="EonX Logo" />
        </div>
        
        <div className="block-screen-message">
          <h1>THE COUNTDOWN IS ON!</h1>
          <br />
          <h5 style={{color:"#fff"}}>Grab $100 Worth of iEX Smart Tokens for Just $30 — Only for the First 10,000 iEX Buyers!</h5>
          <br/>
          <h4 style={{color:"#fff"}}>Begins In:</h4>
        </div>

        <div className="countdown-container">
          <div className="countdown-item">
            <div className="countdown-value">{String(timeLeft.days).padStart(2, '0')}</div>
            <div className="countdown-label">Days</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="countdown-label">Hours</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="countdown-label">Minutes</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-item">
            <div className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="countdown-label">Seconds</div>
          </div>
        </div>

        <div className="block-screen-footer">
          <p>October 13, 2025 • 17:00 PM (UK Time)</p>
        </div>
      </div>
    </div>
  );
};

export default BlockScreen;

