// Utility functions for consistent progress calculations across components

/**
 * Calculate progress percentage based on status data
 * @param {Object} status - Status object from API
 * @param {boolean} hasBought - Whether user has bought tokens
 * @returns {Object} - { progress: number, message: string, isEligible: boolean }
 */
export function calculateProgress(status, hasBought) {
  // If user hasn't bought, show 0% progress
  if (!hasBought) {
    return {
      progress: 0,
      message: "Complete Purchase to Unlock Tier Progress",
      isEligible: false
    };
  }

  // If no status data, show loading state
  if (!status || !status.ok) {
    return {
      progress: 0,
      message: "Loading Tier Data...",
      isEligible: false
    };
  }

  // If all tiers completed
  if (status.done) {
    return {
      progress: 100,
      message: "All Tiers Completed!",
      isEligible: true
    };
  }

  // If user is eligible for next tier, show 100%
  if (status.eligible === true) {
    return {
      progress: 100,
      message: "Ready to Claim!",
      isEligible: true
    };
  }

  // Calculate progress based on all requirements
  if (status.requirements) {
    const { gvm, referrals, ratio } = status.requirements;
    
    // Calculate overall progress based on all requirements
    let totalProgress = 0;
    let completedRequirements = 0;
    let totalRequirements = 0;
    
    // GVM requirement (weight: 40%)
    if (gvm) {
      totalRequirements++;
      if (gvm.met) {
        completedRequirements++;
        totalProgress += 40;
      } else {
        totalProgress += (gvm.progress / 100) * 40;
      }
    }
    
    // Referral requirements (weight: 60%)
    if (referrals) {
      // For tiers 1-3: use direct referrals
      // For tiers 4+: use total referrals
      const tierNo = status.nextTier?.tierNo || status.currentTier + 1;
      
      if (tierNo < 4) {
        // Use direct referrals for tiers 1-3
        if (referrals.direct) {
          totalRequirements++;
          if (referrals.direct.met) {
            completedRequirements++;
            totalProgress += 60;
          } else {
            totalProgress += (referrals.direct.progress / 100) * 60;
          }
        }
      } else {
        // Use total referrals for tiers 4+
        if (referrals.total) {
          totalRequirements++;
          if (referrals.total.met) {
            completedRequirements++;
            totalProgress += 60;
          } else {
            totalProgress += (referrals.total.progress / 100) * 60;
          }
        }
      }
      
      // For tiers 4+, also consider ratio requirements
      if (tierNo >= 4 && ratio) {
        totalRequirements++;
        if (ratio.met) {
          completedRequirements++;
        }
      }
    }
    
    const progress = Math.round(totalProgress);
    
    // Determine message based on progress and requirements
    let message;
    if (completedRequirements === totalRequirements) {
      message = "Ready to Claim!";
    } else if (progress >= 90) {
      message = "Almost There!";
    } else if (progress >= 75) {
      message = "Great Progress!";
    } else if (progress >= 50) {
      message = "Keep Going!";
    } else {
      message = "Getting Started";
    }

    return {
      progress,
      message,
      isEligible: completedRequirements === totalRequirements
    };
  }

  // Fallback: Calculate progress based on GVM requirement only
  if (status.nextTier && status.nextTier.currentGvm && status.nextTier.targetGvm) {
    const currentGvm = Number(status.nextTier.currentGvm);
    const targetGvm = Number(status.nextTier.targetGvm);
    
    if (targetGvm > 0) {
      const gvmProgress = Math.min((currentGvm / targetGvm) * 100, 100);
      const progress = Math.round(gvmProgress);
      
      // Determine message based on progress
      let message;
      if (progress >= 100) {
        message = "Ready to Claim!";
      } else if (progress >= 90) {
        message = "Almost There!";
      } else if (progress >= 75) {
        message = "Great Progress!";
      } else if (progress >= 50) {
        message = "Keep Going!";
      } else {
        message = "Getting Started";
      }

      return {
        progress,
        message,
        isEligible: progress >= 100
      };
    }
  }

  // Fallback: show 50% if user has bought but no tier data
  return {
    progress: 50,
    message: "Loading Tier Data...",
    isEligible: false
  };
}

/**
 * Get tier information for display
 * @param {Object} status - Status object from API
 * @returns {Object} - { currentTier: number, nextTier: number, isCurrentTier: boolean }
 */
export function getTierInfo(status) {
  if (!status || !status.ok) {
    return {
      currentTier: 0,
      nextTier: 0,
      isCurrentTier: false
    };
  }

  const currentTier = status.currentTier || 0;
  
  // If all tiers are completed, don't show a next tier
  if (status.done) {
    return {
      currentTier,
      nextTier: currentTier, // Same as current tier when all are completed
      isCurrentTier: true
    };
  }
  
  const nextTier = status.nextTier?.tierNo || currentTier + 1;
  const isCurrentTier = status.isCurrentTier || false;

  return {
    currentTier,
    nextTier,
    isCurrentTier
  };
}

/**
 * Get detailed progress information for debugging
 * @param {Object} status - Status object from API
 * @param {boolean} hasBought - Whether user has bought tokens
 * @returns {Object} - Debug information
 */
export function getProgressDebugInfo(status, hasBought) {
  return {
    hasBought,
    statusOk: status?.ok || false,
    eligible: status?.eligible,
    done: status?.done,
    currentTier: status?.currentTier,
    nextTier: status?.nextTier,
    gvmMet: status?.nextTier?.gvmMet,
    currentGvm: status?.nextTier?.currentGvm,
    targetGvm: status?.nextTier?.targetGvm,
    isCurrentTier: status?.isCurrentTier,
    requirements: status?.requirements,
    todo: status?.todo
  };
}
