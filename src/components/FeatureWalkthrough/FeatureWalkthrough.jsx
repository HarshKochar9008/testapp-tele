import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomTour from '../CustomTour/CustomTour';
import { shouldShowWalkthrough, completeWalkthrough } from '../../utils/walkthroughUtils';
import './FeatureWalkthrough.css';

const FeatureWalkthrough = ({ userData, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Define walkthrough steps with selectors and descriptions
  const walkthroughSteps = [
    {
      selector: '.footer-item[href="/"]', // Home/Dashboard
      text: 'Monitor your CBP level, earnings, and overall performance. Track your progress towards higher tiers and increased rewards.',
      title: 'Dashboard Command Center'
    },
    {
      selector: '.stats-box', // Stats section on dashboard
      text: 'View your Global iEX Buyers count and Total Blocks Mined statistics. These numbers show your network growth and mining activity.',
      title: 'Statistics Overview'
    },
    {
      selector: '.circular-progress-wrapper', // CBP Progress
      text: 'Track your Circular Business Protocol level and progress towards the next tier. Higher levels unlock better earning opportunities.',
      title: 'CBP Progress Circle'
    },
    {
      selector: '.footer-item[href="/pvc"]', // PVC
      text: 'See your Personal Virality Community and how your network is growing. Each member contributes to your earning potential.',
      title: 'Personal Virality Community'
    },
    {
      selector: '.game-button[href="/share-and-earn"]', // Share & Earn (center button)
      text: 'Share content with your auto-generated referral link. Grow your network and earn from every new member you bring.',
      title: 'Share & Earn Program'
    },
    {
      selector: '.footer-item[href="/earnings"]', // Earnings
      text: 'View all your CBP earnings, bonuses, and rewards in one centralized location. Track your passive income growth.',
      title: 'Earnings Dashboard'
    },
    {
      selector: '.footer-item[href="/plan"]', // Plan/Dashboard
      text: 'Access your dashboard and plan features. Manage your CBP strategy and track your progress towards financial goals.',
      title: 'Plan & Strategy'
    }
  ];

  // Additional steps for specific pages
  const getPageSpecificSteps = () => {
    const path = location.pathname;
    
    switch (path) {
      case '/buy':
        return [
          {
            selector: '.hero-section',
            text: 'Start your earning journey by purchasing iEX tokens. This unlocks your CBP status and opens doors to multiple income streams.',
            title: 'Purchase iEX Tokens'
          },
          {
            selector: '.wallet-info-bar',
            text: 'Connect your wallet to purchase iEX tokens. Ensure you have USDT available for the transaction.',
            title: 'Wallet Connection'
          },
          {
            selector: '.connect-wallet-btn',
            text: 'Click here to connect your wallet and begin the secure purchase process.',
            title: 'Connect Wallet'
          }
        ];
      
      case '/claim':
        return [
          {
            selector: '.claim-section, .withdraw-section, [class*="claim"], [class*="withdraw"]',
            text: 'Withdraw your PVE, Head-on, and Alpha Force earnings. Turn your digital rewards into real value.',
            title: 'Claim Your Rewards'
          }
        ];
      
      case '/tokenomics':
        return [
          {
            selector: '.tokenomics-content, .whitepaper-content, [class*="tokenomics"], [class*="whitepaper"]',
            text: 'Dive deep into EonX documentation. Understand the technology and vision behind your earning opportunities.',
            title: 'Learn & Explore'
          }
        ];
      
      default:
        return [];
    }
  };

  const getCurrentSteps = () => {
    const baseSteps = walkthroughSteps;
    const pageSteps = getPageSpecificSteps();
    return [...baseSteps, ...pageSteps];
  };

  // Check if walkthrough should be shown
  useEffect(() => {
    if (userData && shouldShowWalkthrough(userData)) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [userData, location.pathname]);

  const handleNext = () => {
    const steps = getCurrentSteps();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completeWalkthrough();
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const steps = getCurrentSteps();
  const currentStepData = steps[currentStep];

  return (
    <CustomTour
      steps={steps}
      isOpen={isVisible}
      onClose={handleComplete}
      currentStep={currentStep}
      onNext={handleNext}
      onPrevious={handlePrevious}
    />
  );
};

export default FeatureWalkthrough;
