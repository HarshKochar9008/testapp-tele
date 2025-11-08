import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./SplashScreen.css";
import introVideo from "./intro.mp4";
import introVideoWebM from "./intro.webm";
import introVideo2 from "./intro2.mp4";
import introVideo2Web from "./intro2.webm";


const SplashScreen = () => {
  const navigate = useNavigate();
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef(null);

  const handleStart = () => {
    setHasInteracted(true);
    if (videoRef.current) {
      videoRef.current.muted = false; // Unmute video
      videoRef.current.currentTime = 0; // Restart from the beginning
      videoRef.current.play();
    }
  };

  const handleVideoEnd = () => {
    const hasSeenStory = localStorage.getItem("hasSeenStory");
    if (hasSeenStory) {
      navigate("/home", { replace: true });
    } else {
      navigate("/story", { replace: true });
    }
  };
  const handleSkip = () => {
    const hasSeenStory = localStorage.getItem("hasSeenStory");
    if (hasSeenStory) {
      navigate("/home", { replace: true });
    } else {
      navigate("/story", { replace: true });
    }
  };  

  return (
    <div className="splash-screen">
      {/* Skip Button on top right */}
      <button className="skip-button" onClick={handleSkip}>
        Skip
      </button>

      {/* Muted Background Video */}
      {!hasInteracted && (
        <video
          id="background-video"
          autoPlay
          muted
          loop
          playsInline
          className="splash-video"
        >
          <source src={introVideo2Web} type="video/webm" />
          <source src={introVideo2} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Tap to Start Button (Only Visible Until User Clicks) */}
      {!hasInteracted && (
        <button className="start-button" onClick={handleStart}>
          Tap to Start
        </button>
      )}

      {/* Main Video with Sound (Starts After Tap) */}
      {hasInteracted && (
        <video
          ref={videoRef}
          id="splash-video"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          className="splash-video"
        >
          <source src={introVideoWebM} type="video/webm" />
          <source src={introVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
};

export default SplashScreen;