import React, { useState, useEffect } from "react";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "./MobileCircularProgress.css";
import { useNotification } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
const MobileCircularProgress = ({ userData }) => {
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [tierProgress, setTierProgress] = useState(null);
  const [hasBought, setHasBought] = useState(false);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);
  const [isLoadingTierProgress, setIsLoadingTierProgress] = useState(true);
  const { showComingSoon } = useNotification();
  const navigate = useNavigate();
  
  // Check if user has bought from cbp_users table
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!userData?.id) {
        setIsLoadingPurchase(false);
        return;
      }

      try {
        setIsLoadingPurchase(true);
        const { data, error } = await supabase
          .from('cbp_users')
          .select('has_bought, id')
          .eq('telegram_id', userData.telegram_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking purchase status:', error);
          setHasBought(false);
        } else {
          setHasBought(data?.has_bought === true);
          // If user exists, fetch tier status
          if (data?.id) {
            fetchTierStatus(data.id);
          }
        }
      } catch (error) {
        console.error('Error checking purchase status:', error);
        setHasBought(false);
      } finally {
        setIsLoadingPurchase(false);
      }
    };

    checkPurchaseStatus();
  }, [userData?.id]);

  // Fetch tier status from API (same as Withdraw page)
  const fetchTierStatus = async (referrerId) => {
    if (!referrerId) return;
    
    setIsLoadingTierProgress(true);
    try {
      const { data } = await api.get(`/api/rewards/status`, {
        params: { referrer_id: referrerId, _: Date.now() },
      });
      
      setTierProgress(data);
    } catch (error) {
      console.error('Error fetching tier status:', error);
    } finally {
      setIsLoadingTierProgress(false);
    }
  };

  // Helper function to parse todo requirements
  const parseRequirements = (todo) => {
    if (!todo || !Array.isArray(todo)) return { 
      gvmNeeded: 0, 
      directNeeded: 0, 
      totalNeeded: 0,
      hasDirectRequirement: false,
      hasTotalRequirement: false
    };
    
    let gvmNeeded = 0;
    let directNeeded = 0;
    let totalNeeded = 0;
    let hasDirectRequirement = false;
    let hasTotalRequirement = false;
    
    todo.forEach(item => {
      const todoText = item.toLowerCase();
      
      // Parse GVM requirements: "Wait until global users reach ≥ 201 (now 3)."
      const gvmMatch = todoText.match(/wait until.*?(\d+)\s*\(now\s*(\d+)\)/i);
      if (gvmMatch) {
        const targetGvm = parseInt(gvmMatch[1]);
        const currentGvm = parseInt(gvmMatch[2]);
        gvmNeeded = Math.max(0, targetGvm - currentGvm);
      }
      
      // Parse direct buyer requirements: "Need 1 more DIRECT valid buyers."
      const directMatch = todoText.match(/need\s+(\d+)\s+more\s+direct/i);
      if (directMatch) {
        hasDirectRequirement = true;
        directNeeded = parseInt(directMatch[1]);
      }
      
      // Also check if the text mentions "direct" requirement in other ways
      if (todoText.includes('direct') && !hasDirectRequirement) {
        // If we see "direct" but couldn't parse the number, assume requirement exists but incomplete
        hasDirectRequirement = true;
        // Keep directNeeded as is (might be from a previous match or stay 0)
      }
      
      // Parse total buyer requirements (if any)
      const totalMatch = todoText.match(/need\s+(\d+)\s+more\s+total/i);
      if (totalMatch) {
        hasTotalRequirement = true;
        totalNeeded = parseInt(totalMatch[1]);
      }
    });
    
    return { gvmNeeded, directNeeded, totalNeeded, hasDirectRequirement, hasTotalRequirement };
  };

  // Update progress based on tier status data
  useEffect(() => {
    if (hasBought === false) {
      // If user hasn't bought, show 0% progress
      setProgress(0);
      setTargetProgress(0);
    } else if (tierProgress) {
      // If all requirements are fulfilled, show 100%
      if (tierProgress.eligible === true) {
        setTargetProgress(100);
      } else {
        // Calculate progress: GVM (0-90%) + Direct Referrals bonus (+10% if met)
        let progress = 0;
        
        const nextTier = tierProgress.nextTier;
        const todo = tierProgress.todo;
        
        if (!nextTier) {
          setTargetProgress(0);
          return;
        }
        
        // Parse requirements from todo
        const requirements = parseRequirements(todo);
        
        // Calculate GVM progress (0-90% based on current/target ratio)
        let gvmProgress = 0;
        const currentGvm = Number(nextTier.currentGvm || 0);
        const targetGvm = Number(nextTier.targetGvm || 1);
        
        if (nextTier.gvmMet === true || currentGvm >= targetGvm) {
          gvmProgress = 90;
        } else if (targetGvm > 0) {
          // Calculate partial progress based on GVM ratio
          gvmProgress = Math.min((currentGvm / targetGvm) * 90, 90);
        }
        
        progress += gvmProgress;

        if(tierProgress.directOk == true){
          progress += 10;
        }
        // Otherwise no bonus (direct requirement not met)
        
        // Ensure progress is between 0-100%
        progress = Math.max(0, Math.min(100, Math.round(progress)));
        setTargetProgress(progress);
      }
    } else if (hasBought === true) {
      // User has bought but no tier progress data yet - show 0% until data loads
      setTargetProgress(0);
    } else {
      // Default case - show 0% progress
      setTargetProgress(0);
    }
  }, [tierProgress, hasBought]);

  // Animation effect for progress bar
  useEffect(() => {
    if (targetProgress >= 0 && !isNaN(targetProgress)) {
      let start = 0;
      const end = targetProgress;
      const duration = 1500; // ms
      const step = 10; // ms per frame
      const increment = (end / duration) * step;

      const interval = setInterval(() => {
        start += increment;
        if (start >= end) {
          start = end;
          clearInterval(interval);
        }
        setProgress(Math.round(start));
      }, step);

      return () => clearInterval(interval);
    } else {
      // If targetProgress is invalid, set progress to 0
      setProgress(0);
    }
  }, [targetProgress]);

  return (
    <div className="d-block d-md-none w-100 py-4">
      <div className="mx-auto progress-container" style={{ maxWidth: 300, position: 'relative' }}>
        <CircularProgressbarWithChildren
          value={progress}
          strokeWidth={8}
          styles={buildStyles({
            pathColor: "url(#gradient)",
            trailColor: "#2c2c2c",
          })}
        >
          <svg style={{ height: 0 }}>
            <defs>
              <linearGradient id="gradient" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff00" />
                <stop offset="100%" stopColor="#007700" />
              </linearGradient>
            </defs>
          </svg>

          <div style={{ fontSize: 48 }} className="text-white fw-bold fs-3">
            {isLoadingPurchase || isLoadingTierProgress ? "..." : `${progress}%`}
          </div>
          <div
            style={{
              color: "#C7C7C7",
              fontSize: 12,
              marginTop: 4,
              textAlign: 'center'
            }}
          >
            {isLoadingPurchase || isLoadingTierProgress ? (
              "Loading..."
            ) : hasBought === true ? (
              tierProgress ? (
                tierProgress.done ? "All Tiers Completed!" :
                tierProgress.eligible ? "Ready to Claim!" :
                progress >= 90 ? "Almost There!" :
                progress >= 75 ? "Great Progress!" :
                progress >= 60 ? "Keep Going!" :
                "Getting Started"
              ) : (
                "Loading Tier Data..."
              )
            ) : (
              "Complete Purchase to Unlock Tier Progress"
            )}
          </div>

          <div style={{ 
            fontSize: 10, 
            color: "#00FF00", 
            marginTop: 2,
            textAlign: 'center'
          }}>
            {isLoadingPurchase || isLoadingTierProgress ? (
              "Checking status..."
            ) : hasBought === true ? (
              tierProgress ? (
                tierProgress.done ? (
                  "All tiers completed!"
                ) : (
                  <>
                    Tier {tierProgress.currentTier} → {tierProgress.nextTier?.tierNo || 'N/A'} • 
                    {tierProgress.eligible ? "Ready!" : "In Progress"}
                  </>
                )
              ) : (
                "Loading tier data..."
              )
            ) : (
              "Buy iEX tokens to see your tier progress"
            )}
          </div>
        </CircularProgressbarWithChildren>
        
        {/* Show overlay only for users who haven't purchased - Buy Button */}
        {!isLoadingPurchase && !hasBought && (
          <div 
            className="progress-overlay" 
            onClick={() => navigate("/buy")}
            style={{ cursor: 'pointer' }}
          >
            <div className="overlay-content">
              <div className="coming-soon-text" style={{ 
                color: '#00FF00', 
                fontSize: '24px', 
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
                border: '2px solid #00FF00',
                borderRadius: '8px',
                padding: '8px 16px',
                background: 'rgba(0, 255, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}>
                 Buy iEX
              </div>
              <div className="launch-message">Click to get your iEX tokens!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default MobileCircularProgress;
