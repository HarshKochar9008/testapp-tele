import React, { useEffect, useRef, useState } from "react";
import "./custom-tour.css";

const CustomTour = ({ steps, isOpen, onClose, currentStep = 0, onNext, onPrevious }) => {
  const [stepIndex, setStepIndex] = useState(currentStep);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowDirection, setArrowDirection] = useState('');
  const [isBottomNavElement, setIsBottomNavElement] = useState(false);
  const tooltipRef = useRef();

  useEffect(() => {
    if (!isOpen || !steps?.length) return;
  
    const target = document.querySelector(steps[stepIndex].selector);
    if (!target) return;
  
    // Remove previous highlights
    document.querySelectorAll(".tour-highlight").forEach((el) => {
      el.classList.remove("tour-highlight");
    });
  
    target.classList.add("tour-highlight");
  
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 300;
    const tooltipHeight = 180;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate available space above and below the element
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    
    // Determine optimal vertical position (always prefer upward placement for buttons)
    let top, placement;
    const verticalMargin = 30; // Increased margin for better visibility
    
    // Check if target is a button element or walkthrough button
    const isButtonElement = target.tagName === 'BUTTON' || 
                           target.classList.contains('btn') ||
                           target.classList.contains('button') ||
                           target.classList.contains('game-button') ||
                           target.classList.contains('footer-item') ||
                           target.classList.contains('nav-item') ||
                           target.closest('.game-container') ||
                           target.closest('.bottom-navbar');
    
    // Special handling for bottom navigation elements (including walkthrough button)
    const isBottomNavElementCheck = target.closest('.bottom-navbar') || 
                                   target.closest('.game-container') ||
                                   rect.bottom > viewportHeight - 100; // Elements in bottom 100px
    
    // Set state for use in JSX
    setIsBottomNavElement(isBottomNavElementCheck);
    
    // Always prefer upward placement for buttons to keep them visible
    if (isButtonElement || isBottomNavElementCheck) {
      if (spaceAbove >= tooltipHeight + verticalMargin) {
        // Place above buttons with good spacing - extra spacing for bottom nav elements
        const spacing = isBottomNavElementCheck ? 60 : 30;
        top = rect.top - tooltipHeight - spacing;
        placement = 'above';
      } else {
        // If not enough space above, force center positioning to keep button visible
        top = Math.max(20, (viewportHeight - tooltipHeight) / 2);
        placement = 'above';
      }
    } else {
      // For non-button elements, prefer below if there's space
      if (spaceBelow >= tooltipHeight + verticalMargin) {
        top = rect.bottom + 20;
        placement = 'below';
      } else if (spaceAbove >= tooltipHeight + verticalMargin) {
        top = rect.top - tooltipHeight - 20;
        placement = 'above';
      } else {
        // Center positioning as fallback
        top = Math.max(20, (viewportHeight - tooltipHeight) / 2);
        placement = 'above';
      }
    }
    
    // Calculate horizontal position (center on screen for better visibility)
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    
    // Center horizontally on screen for better visibility
    left = Math.max(20, Math.min(left, viewportWidth - tooltipWidth - 20));
    
    // If element is too close to edges, center the tooltip on screen
    if (rect.left < tooltipWidth / 2 || rect.right > viewportWidth - tooltipWidth / 2) {
      left = (viewportWidth - tooltipWidth) / 2;
    }
    
    
    // Special handling for mobile screens (height < 600px)
    if (viewportHeight < 600) {
      // On very small screens, prioritize keeping tooltip and button visible
      if (top + tooltipHeight > viewportHeight - 20) {
        top = Math.max(20, viewportHeight - tooltipHeight - 20);
        placement = 'above';
      }
      if (top < 20) {
        top = 20;
        placement = 'above'; // Keep above to maintain button visibility
      }
      
      // For buttons and bottom nav elements on mobile, always ensure they stay visible
      if ((isButtonElement || isBottomNavElementCheck) && top < rect.bottom + 10) {
        top = Math.max(20, rect.bottom + 10);
        placement = 'above';
      }
      
      // Special case: if the target is in bottom navigation, force tooltip above with more spacing
      if (isBottomNavElementCheck) {
        top = Math.max(20, rect.top - tooltipHeight - 80); // Increased spacing to 80px
        placement = 'above';
      }
    }
  
    setTooltipStyle({
      position: "fixed",
      top: Math.max(20, Math.min(top, viewportHeight - tooltipHeight - 20)),
      left: Math.max(20, Math.min(left, viewportWidth - tooltipWidth - 20)),
      zIndex: 10000,
    });
    
    // Set arrow direction based on placement
    setArrowDirection(placement === 'above' ? 'arrow-down' : 'arrow-up');
  
    return () => {
      target.classList.remove("tour-highlight");
    };
  }, [stepIndex, isOpen, steps]);

  // Sync with external step control
  useEffect(() => {
    setStepIndex(currentStep);
  }, [currentStep]);
  

  const nextStep = () => {
    if (onNext) {
      onNext();
    } else {
      if (stepIndex < steps.length - 1) {
        setStepIndex(stepIndex + 1);
      } else {
        onClose();
      }
    }
  };

  const prevStep = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      if (stepIndex > 0) {
        setStepIndex(stepIndex - 1);
      }
    }
  };

  const skipTour = () => {
    onClose();
  };

  if (!isOpen || !steps?.length) return null;

  return (
    <>
      <div
        className="modern-tour-overlay"
        onClick={(e) => {
          e.stopPropagation(); // block dismissing on overlay click
        }}
      />

      <div
        className={`floating-tour-tooltip ${arrowDirection} ${isBottomNavElement ? 'bottom-nav-target' : ''}`}
        style={tooltipStyle}
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()} // also prevents bubbling
      >
        {/* Tooltip header with progress */}
        <div className="tooltip-header">
          <div className="step-progress">
            <span className="step-number">{stepIndex + 1}</span>
            <span className="step-total">/ {steps.length}</span>
          </div>
          <button className="close-btn" onClick={skipTour}>
            <span>✕</span>
          </button>
        </div>

        {/* Tooltip content */}
        <div className="tooltip-content">
          {steps[stepIndex].title && (
            <h3 className="tooltip-title">{steps[stepIndex].title}</h3>
          )}
          <p className="tooltip-text">{steps[stepIndex].text}</p>
        </div>

        {/* Navigation controls */}
        <div className="tooltip-controls">
          <div className="progress-indicator">
            {stepIndex + 1}/{steps.length}
          </div>
          <div className="nav-buttons">
            {stepIndex > 0 && (
              <button className="nav-btn prev-btn" onClick={prevStep}>
                Previous
              </button>
            )}
            <button className="nav-btn next-btn" onClick={nextStep}>
              {stepIndex === steps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>

  );
};

export default CustomTour;
