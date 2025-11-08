import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./StoryViewer.css";

const StoryViewer = ({ images = [] }) => {
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const handleNext = () => {
    if (index < images.length - 1) {
      setIndex(index + 1);
      setLoading(true);
    } else {
      navigate("/");
    }
  };
  
  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setLoading(true);
    }
  };
  

  return (
    <div className="story-overlay">
      <div className="story-progress">
        {images.map((_, i) => (
          <div
            key={i}
            className={`progress-dot ${i <= index ? "active" : ""}`}
          />
        ))}
      </div>

      <div className="story-image-container">
        {loading && (
          <div className="story-loader">
            <div className="spinner" />
          </div>
        )}
        <img
          src={images[index]}
          alt={`story-${index}`}
          className="story-image"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)} // optional fallback
        />
      </div>

      <div className="story-controls">
        <button onClick={handlePrev} disabled={index === 0} className="story-btn">
          Back
        </button>
        <button onClick={handleNext} className="story-btn primary">
          {index === images.length - 1 ? "Finish" : "Continue"}
        </button>
      </div>


      <button className="story-close" onClick={() => navigate("/")}>✕</button>
    </div>
  );
};

export default StoryViewer;
