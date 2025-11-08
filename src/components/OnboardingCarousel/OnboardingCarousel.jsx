import React, { useState, useEffect } from 'react';
import './OnboardingCarousel.css';

const OnboardingCarousel = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const slides = [
    {
      id: 1,
      image: "/Page1.png"
    },
    {
      id: 2,
      image: "/Page 2.png"
    },
    {
      id: 3,
      image: "/Page 3.png"
    },
    {
      id: 4,
      image: "/Page 4.png"
    }
  ];

  // Autoplay functionality
  useEffect(() => {
    if (!isAutoplay) return;

    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => {
        if (prevSlide < slides.length - 1) {
          return prevSlide + 1;
        } else {
          setIsAutoplay(false);
          handleComplete();
          return prevSlide;
        }
      });
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [isAutoplay, slides.length]);

  const handleNext = () => {
    setIsAutoplay(false); // Stop autoplay when user interacts
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    setIsAutoplay(false); // Stop autoplay when user interacts
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    setIsAutoplay(false);
    handleComplete();
  };

  const handleComplete = () => {
    setIsAutoplay(false);
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const handleDotClick = (index) => {
    setIsAutoplay(false); // Stop autoplay when user interacts
    setCurrentSlide(index);
  };

  if (!isVisible) return null;

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="onboarding-carousel">
      <div className="slide-container">
        <img src={currentSlideData.image} alt={`Page ${currentSlideData.id}`} />
        <button 
          className="next-button-integrated"
          onClick={handleNext}
        >
          {isLastSlide ? (
            <>
              Get Started
              <img src="/arrow_right.svg" alt="Get Started" />
            </>
          ) : (
            <>
              Next
              <img src="/arrow_right.svg" alt="Next" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OnboardingCarousel;
