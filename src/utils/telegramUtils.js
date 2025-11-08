export const openTelegramLink = async (url, successMessage = 'Opening link...', errorMessage = 'Failed to open link', showToast = null) => {
  try {
    if (!url) {
      throw new Error('No URL provided');
    }

    if (window.Telegram?.WebApp) {
      try {
        console.log('Attempting to open link via Telegram WebApp:', url);
        window.Telegram.WebApp.openLink(url, { tryInstantView: false });
        console.log('Successfully opened link via Telegram WebApp');
        
        if (showToast && successMessage) {
          showToast(successMessage);
        }
        return true;
      } catch (telegramError) {
        console.warn('Telegram WebApp failed to open link, falling back to standard method:', telegramError);
        
        try {
          window.open(url, "_blank");
          if (showToast && successMessage) {
            showToast(successMessage);
          }
          return true;
        } catch (fallbackError) {
          console.error('Standard fallback also failed:', fallbackError);
          throw new Error('Both Telegram WebApp and standard methods failed');
        }
      }
    } else {
      console.log('Opening link in standard browser:', url);
      window.open(url, "_blank");
      
      if (showToast && successMessage) {
        showToast(successMessage);
      }
      return true;
    }
  } catch (error) {
    console.error('Failed to open link:', error);
    
    if (showToast && errorMessage) {
      showToast(errorMessage);
    }
    return false;
  }
};

export const openTelegramChat = async (username, showToast) => {
  try {
    if (!username || username.startsWith("User_") || /^\d+$/.test(username)) {
      showToast?.("This user doesn't have a public Telegram username");
      return false;
    }

    // Remove @ symbol if present
    const cleanUsername = username.replace(/^@/, '');
    const chatUrl = `https://t.me/${cleanUsername}`;

    const tg = window?.Telegram?.WebApp;
    
    if (tg && typeof tg.openTelegramLink === 'function') {
      console.log("Opening Telegram chat via WebApp for username:", cleanUsername);
      try {
        tg.openTelegramLink(chatUrl);
        showToast?.(`Opening chat with @${cleanUsername}...`);
        return true;
      } catch (error) {
        console.error("Telegram WebApp openTelegramLink failed:", error);
        // Fallback to window.open
      }
    }
    
    // Fallback method
    console.log("Opening Telegram chat via browser for username:", cleanUsername);
    const opened = window.open(chatUrl, "_blank", "noopener,noreferrer");
    
    if (opened) {
      showToast?.(`Opening chat with @${cleanUsername}...`);
      return true;
    } else {
      showToast?.("Failed to open chat. Please check your popup blocker.");
      return false;
    }
    
  } catch (error) {
    console.error("Error opening Telegram chat:", error);
    showToast?.("Failed to open Telegram chat");
    return false;
  }
};

export const openTelegramBot = async (botUsername, showToast) => {
  try {
    if (!botUsername) {
      showToast?.("Invalid bot username");
      return;
    }

    const tg = window?.Telegram?.WebApp;
    const link = `https://t.me/${botUsername}`;

    if (tg && tg.openTelegramLink) {
      console.log("Opening Telegram bot via WebApp:", link);
      tg.openTelegramLink(link);
    } else {
      console.log("Telegram WebApp failed to open link, falling back to standard method:", link);
      window.open(link, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.error("Error opening Telegram bot:", error);
    showToast?.("Failed to open Telegram bot");
  }
};

export const isTelegramWebApp = () => {
  return !!(window.Telegram?.WebApp);
};

export const getTelegramWebApp = () => {
  return window.Telegram?.WebApp || null;
};