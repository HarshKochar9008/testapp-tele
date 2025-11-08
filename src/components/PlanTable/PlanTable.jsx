import React, { useState, useEffect } from "react";
import "./PlanTable.css";
import axios from 'axios';
import { sum } from "d3";

// Backend URL configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000";

const PlanTable = ({ userStatus, globalStats, userData }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [tiers, setTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(true);

  // Fetch tiers from backend
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        setLoadingTiers(true);
        console.log('📡 [PLANTABLE] Fetching tiers from backend...');
        
        // Fetch all tiers from 1 to 28
        const response = await axios.get(`${BACKEND_URL}/api/rewards/tiers`, {
          params: { 
            min_tier: 1, 
            max_tier: 28,
            _: Date.now() 
          }
        });
        
        setTiers(response.data.tiers || []);
      } catch (error) {
        console.error('❌ [PLANTABLE] Error fetching tiers:', error);
        // No fallback - show empty state until API is available
        setTiers([]);
      } finally {
        setLoadingTiers(false);
      }
    };

    fetchTiers();
  }, []);


  const toggleRow = (rowIndex) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowIndex]: !prev[rowIndex]
    }));
  };

  // Handle surrender button clicks
  const handleFlushedOut = (tierNumber) => {
    // TODO: Implement flushed out logic
    alert(`Flushed Out action for Tier ${tierNumber} - This feature will be implemented soon!`);
  };

  const handleSurrenderNFT = (tierNumber) => {
    // TODO: Implement surrender NFT logic
    alert(`Surrender NFT action for Tier ${tierNumber} - This feature will be implemented soon!`);
  };

  const getStatusClass = (status) => {
    if (status === "completed") return "status-completed";
    if (status === "active") return "status-active";
    return "status-remaining";
  };

  // Return all tiers from database
  const getVisibleTiers = () => {
    return tiers;
  };

  // Convert tiers from backend to display format - completely dynamic
  const levels = getVisibleTiers().map(tier => {
    // Determine condition based on tier number
    let condition = "";
    if (tier.tier_no >= 1 && tier.tier_no <= 3) {
      condition = ""; // No condition for tiers 1-3
    } else if (tier.tier_no >= 4 && tier.tier_no <= 9) {
      condition = "70:30"; // 70:30 condition for tiers 4-9
    } else if (tier.tier_no >= 10 && tier.tier_no <= 28) {
      condition = "70:15:15"; // 70:15:15 condition for tiers 10-28
    }

    return {
      tier: tier.tier_no,
      momentum: tier.tier_no === 1 ? `First ${tier.cumulative_gvm}` : `Next ${tier.cumulative_gvm}`,
      earning: tier.pve_amount_usd, // PVE amount from database
      community: tier.tier_no >= 4 
        ? `${tier.valid_total_required} Total Team Secured` // Use valid_total_required for tiers 4+
        : `${tier.direct_required} Direct Referrals Required`, // Use direct_required for tiers 1-3
      condition: condition,
      gvmRequired: tier.cumulative_gvm, // GVM from database
      directRequired: tier.direct_required, // Direct referrals from database
      validTotalRequired: tier.valid_total_required, // Valid total referrals from database
      pveAmountUsd: tier.pve_amount_usd, // Store original PVE amount
    };
  });

  // Calculate user's current tier and progress
  const getCurrentTier = () => {
    if (!userStatus?.ok) return 1; // Fallback to tier 1 for testing
    return userStatus.currentTier || 1;
  };

  const getNextTier = () => {
    const current = getCurrentTier();
    return current + 1;
  };

  const isTierCompleted = (tierNumber) => {
    return getCurrentTier() > tierNumber;
  };

  const isTierActive = (tierNumber) => {
    return getCurrentTier() === tierNumber;
  };

  const isTierEligible = (tierNumber) => {
    return (userStatus?.eligible || true) && getNextTier() === tierNumber;
  };

  // Get user's actual progress data
  const getUserProgress = () => {
    if (!userStatus?.ok) {
      // Fallback data for testing when backend is not available
      return { 
        gvm: 150, 
        referrals: 1, 
        teamSize:0,
        completedTiers: 1,
        isEligible: true,
        currentTier: 1,
        nextTier: 2
      };
    }
    
    return {
      gvm: parseInt(userStatus.nextTier?.currentGvm || 0),
      referrals: userStatus.legs?.length || 0,
      teamSize : parseInt(userStatus.powerLeg || 0) + parseInt(userStatus.powerLeg2 || 0) + parseInt(userStatus.secondLeg || 0),
      completedTiers: getCurrentTier(),
      isEligible: userStatus.eligible || false,
      currentTier: getCurrentTier(),
      nextTier: getNextTier()
    };
  };

  const userProgress = getUserProgress();


  if (loadingTiers) {
    return (
      <div className="plan-table-container">
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
          Loading tiers...
        </div>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="plan-table-container">
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
          No tiers data available. Please check your connection or try again later.
        </div>
      </div>
    );
  }
  
  return (
    <div className="plan-table-container">
      <table className="plan-table">
        <thead>
          <tr>
            <th>SR NO.</th>
            <th>Global iEX Buyers(GVM)</th>
            <th>Personal Virality Earning (PVE)</th>
            <th>Personal Virality Community (PVC)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
            {levels.map((level, idx) => {
                const isCompleted = isTierCompleted(level.tier);
                const isActive = isTierActive(level.tier);
                const isEligible = isTierEligible(level.tier);
                const isExpanded = expandedRows[idx];

                // Check if this tier is surrendered
                const isSurrendered = userStatus?.is_surrender && level.tier >= 10;
                
                // Determine status based on user's actual progress
                let statusClass = "status-remaining";
                let statusIcon = "";
                let momentumText = "Remaining";
                let earningText = "Remaining";
                let communityText = "Remaining";
                
                if (isSurrendered) {
                    statusClass = "status-surrendered";
                    statusIcon = "💀";
                    momentumText = level.momentum;
                    earningText = `$${level.earning}`;
                    communityText = "SURRENDERED";
                } else if (isCompleted) {
                    statusClass = "status-completed";
                    statusIcon = "✅";
                    momentumText = level.momentum;
                    earningText = `$${level.earning}`;
                    communityText = "Completed";
                } else if (isActive) {
                    statusClass = "status-active";
                    statusIcon = "🔄";
                    
                    // Show progress for active tier using dynamic values
                    const progressGvm = Math.min(userProgress.gvm, level.gvmRequired);
                    
                    // Use different referral fields based on tier
                    let progressReferrals, totalReferrals, referralLabel;
                    if (level.tier >= 4) {
                        progressReferrals = Math.min(userProgress.teamSize, level.validTotalRequired);
                        totalReferrals = level.validTotalRequired;
                        referralLabel = "Total Referrals Secured";
                    } else {
                        progressReferrals = Math.min(userProgress.referrals, level.directRequired);
                        totalReferrals = level.directRequired;
                        referralLabel = "Direct Referrals Secured";
                    }
                    
                    momentumText = `${progressGvm} Secured`;
                    earningText = `$${level.earning}`;
                    communityText = `${progressReferrals} ${referralLabel}`;
                } else if (isEligible) {
                    statusClass = "status-eligible";
                    statusIcon = "🎯";
                    momentumText = level.momentum;
                    earningText = `$${level.earning}`;
                    communityText = level.community;
                } else {
                    // Future tier - show actual values from database
                    statusClass = "status-remaining";
                    statusIcon = "➡️";
                    momentumText = level.momentum;
                    earningText = `$${level.earning}`;
                    communityText = level.community;
                }

                return (
                    <React.Fragment key={idx}>

                    <tr className={statusClass}>
                        <td>{idx + 1}</td>
                        <td>{momentumText}</td>
                        <td>{earningText}</td>
                        <td>{communityText}</td>
                        <td>
                          <div className="status-indicator">
                            <span className="status-icon">{statusIcon}</span>
                            {isSurrendered ? (
                              <div className="surrender-buttons">
                                <button 
                                  className="surrender-btn flushed-btn"
                                  onClick={() => handleFlushedOut(level.tier)}
                                >
                                  Flushed Out
                                </button>
                                <button 
                                  className="surrender-btn nft-btn"
                                  onClick={() => handleSurrenderNFT(level.tier)}
                                >
                                  Surrender NFT
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="accordion-toggle"
                                onClick={() => toggleRow(idx)}
                              >
                                <img 
                                  src="/arrow_end.svg" 
                                  alt="arrow" 
                                  className={`arrow-icon ${isExpanded ? 'rotated' : ''}`}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                    </tr>

                    <tr className={`accordion-row ${isExpanded ? 'expanded' : 'collapsed'}`}>
                        <td></td>
                        <td>{level.momentum}</td>
                        <td>${level.earning}</td>
                        <td>{level.community}</td>
                        <td>

                        </td>
                    </tr>

                    <tr className={`accordion-row ${isExpanded ? 'expanded' : 'collapsed'}`}>
                        <td></td>
                        <td colSpan="3" style={{ textAlign: "left", fontStyle: "italic", paddingLeft: "10px" }}>
                        <span className="condition-line">
                            {level.condition ? `Total PVC  - 2, Condition  – ${level.condition}, Most Active Team - 10` : "Total PVC  - 2, No special condition"}
                        </span>

                        </td>
                        <td></td>
                    </tr>
                    </React.Fragment>
                );
            })}
        </tbody>


      </table>
        <div className="legend-section">
            <div className="legend-item">
                <span className="legend-text">Remaining</span>
                <div className="legend-icon remaining"></div>
            </div>
            <div className="legend-item">
                <span className="legend-text active">Active</span>
                <div className="legend-icon active"></div>
            </div>
            <div className="legend-item">
                <span className="legend-text">Completed</span>
                <div className="legend-icon completed"></div>
            </div>
        </div>
    </div>
  );
};

export default PlanTable;
