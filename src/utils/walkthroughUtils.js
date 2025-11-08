/**
 * Walkthrough utilities for managing app walkthrough state
 */

const WALKTHROUGH_STORAGE_KEY = 'eonx_app_walkthrough_completed';
const WALKTHROUGH_VERSION = '1.0.0'; // Increment this to reset walkthrough for all users

/**
 * Check if walkthrough should be shown for the given user
 * @param {Object} userData - User data object
 * @returns {boolean} - True if walkthrough should be shown
 */
export function shouldShowWalkthrough(userData) {
  // Don't show walkthrough if user data is not available
  if (!userData) {
    return false;
  }

  // Check if walkthrough was already completed
  const completedWalkthrough = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
  if (completedWalkthrough) {
    try {
      const walkthroughData = JSON.parse(completedWalkthrough);
      
      // If walkthrough version changed, reset it
      if (walkthroughData.version !== WALKTHROUGH_VERSION) {
        localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
        return true;
      }
      
      // Check if it's the same user
      if (walkthroughData.userId === userData.id) {
        return false; // Already completed for this user
      }
    } catch (error) {
      console.error('Error parsing walkthrough data:', error);
      localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
    }
  }

  // Show walkthrough for new users or users who haven't completed it
  return true;
}

/**
 * Mark walkthrough as completed for the current user
 * @param {Object} userData - User data object (optional)
 */
export function completeWalkthrough(userData = null) {
  try {
    const walkthroughData = {
      completed: true,
      timestamp: new Date().toISOString(),
      version: WALKTHROUGH_VERSION,
      userId: userData?.id || 'unknown'
    };
    
    localStorage.setItem(WALKTHROUGH_STORAGE_KEY, JSON.stringify(walkthroughData));
    console.log('Walkthrough completed for user:', userData?.id || 'unknown');
  } catch (error) {
    console.error('Error saving walkthrough completion:', error);
  }
}

/**
 * Reset walkthrough (for testing or if user wants to see it again)
 * @param {number} telegramId - Optional telegram ID to reset specific user's walkthrough
 */
export function resetWalkthrough(telegramId = null) {
  localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
  
  // If telegram ID is provided, clear specific user's onboarding and walkthrough data
  if (telegramId) {
    localStorage.removeItem(`onboarding_completed_${telegramId}`);
    localStorage.removeItem(`feature_walkthrough_completed_${telegramId}`);
  } else {
    // Clear all onboarding and feature walkthrough data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('onboarding_completed_') || key.startsWith('feature_walkthrough_completed_')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  console.log('Walkthrough reset');
}

/**
 * Check if walkthrough was completed by current user
 * @param {Object} userData - User data object
 * @returns {boolean} - True if walkthrough was completed
 */
export function isWalkthroughCompleted(userData) {
  if (!userData) return false;
  
  try {
    const completedWalkthrough = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (completedWalkthrough) {
      const walkthroughData = JSON.parse(completedWalkthrough);
      return walkthroughData.userId === userData.id && 
             walkthroughData.version === WALKTHROUGH_VERSION;
    }
  } catch (error) {
    console.error('Error checking walkthrough completion:', error);
  }
  
  return false;
}

/**
 * Get walkthrough completion timestamp
 * @returns {string|null} - ISO timestamp or null if not completed
 */
export function getWalkthroughCompletionTime() {
  try {
    const completedWalkthrough = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (completedWalkthrough) {
      const walkthroughData = JSON.parse(completedWalkthrough);
      return walkthroughData.timestamp;
    }
  } catch (error) {
    console.error('Error getting walkthrough completion time:', error);
  }
  
  return null;
}

/**
 * Force show walkthrough (bypass all checks)
 * This is useful for testing or admin purposes
 */
export function forceShowWalkthrough() {
  localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
  console.log('Walkthrough forced to show');
}

/**
 * Get walkthrough data for debugging/testing purposes
 * @returns {Object} - Current walkthrough data
 */
export function getWalkthroughData() {
  try {
    const data = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return {
      completed: false,
      version: null,
      userId: null,
      timestamp: null
    };
  } catch (error) {
    console.error('Error getting walkthrough data:', error);
    return {
      completed: false,
      version: null,
      userId: null,
      timestamp: null
    };
  }
}

/**
 * Clear all walkthrough data (for testing)
 */
export function clearAllWalkthroughData() {
  try {
    localStorage.removeItem(WALKTHROUGH_STORAGE_KEY);
    localStorage.removeItem('eonx_app_walkthrough_version');
    localStorage.removeItem('eonx_app_walkthrough_completed_timestamp');
    
    // Clear all onboarding and feature walkthrough data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('onboarding_completed_') || key.startsWith('feature_walkthrough_completed_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('All walkthrough data cleared');
  } catch (error) {
    console.error('Error clearing walkthrough data:', error);
  }
}
