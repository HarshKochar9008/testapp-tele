import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header/Header";
import Dashboard from "./pages/Dashboard/Dashboard";
import StoryViewer from "./components/StoryViewer/StoryViewer";
import Plan from "./pages/Plan/Plan";
import Plan2 from "./pages/Plan/Plan2";
import Tokenomics from "./pages/Tokenomics/Tokenomics";
import Terms from "./pages/Terms/Terms";
import Terms2 from "./pages/Terms/Terms2";
import PVC from "./pages/PVC/PVC";
// import Buy from "./pages/Buy/Buy";
// import BulkBuy from "./pages/BulkBuy/BulkBuy";
import Earnings from "./pages/Earnings/Earnings";
// import Withdraw from "./pages/Withdraw/Withdraw";
import ShareAndEarn from "./pages/ShareAndEarn/ShareAndEarn";
// import Claim from "./pages/Claim/Claim";
// import Leaderboard from "./pages/Leaderboard/Leaderboard";
// import OnboardingCarousel from "./components/OnboardingCarousel/OnboardingCarousel";
// import BlockScreen from "./components/BlockScreen/BlockScreen";
// import FeatureWalkthrough from "./components/FeatureWalkthrough/FeatureWalkthrough";
// import TelegramChannelPopup from "./components/TelegramChannelPopup/TelegramChannelPopup";

import "./App.css";
import { AppKitProvider } from "./AppKitProvider";
import { TelegramProvider, useTelegram } from "./context/TelegramContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AUTH_USER, CHECK_USER_TG_CHANNEL_JOINED, GET_USER, GET_UNREAD_COUNT } from "./services/Api";
import Footer from "./components/Footer/Footer";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "";

function App() {
  const [token, setToken] = useState(null);
  const { telegramData } = useTelegram();
  // const [fuelPercentage, setFuelPercentage] = useState(0);
  // const [spinWheelTaskId, setSpinWheelTaskId] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);



  const [userLoaded, setUserLoaded] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Initializing...");
  // const [showOnboarding, setShowOnboarding] = useState(false);
  // const [showFeatureWalkthrough, setShowFeatureWalkthrough] = useState(false);
  // const [showTelegramChannelPopup, setShowTelegramChannelPopup] = useState(false);

  // Helper function to get localStorage keys specific to the user
  const getStorageKey = (key) => {
    return `${key}_${userData?.telegram_id || 'default'}`;
  };

  const location = useLocation();
  const hideHeaderAndNavbar = location.pathname === "/splash";

  // const checkIfUserTgChannelJoined = useCallback(async (jwt) => {
  //   try {

  //     const response = await axios.get(CHECK_USER_TG_CHANNEL_JOINED, {
  //       headers: { Authorization: `Bearer ${jwt}` },
  //     });


  //     if(response.data.status == true) {
  //       return true;
  //     }
  //     else {
  //       // Show popup if user has not joined the channel
  //       setShowTelegramChannelPopup(true);
  //       return false;
  //     }
  //   } catch (error) {
  //     console.error("Error checking if user tg channel joined:", error.response?.data || error.message);
  //   }

    
  // }, []);

  const sendTelegramData = useCallback(async (dataFromTelegram) => {
    try {
      setLoaderMessage("Authorizing...");
      
      // In development mode, bypass authentication and use mock data
      if (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development") {
        console.log("Development mode: Bypassing authentication");
        setLoaderMessage("Loading development environment...");
        
        // Create a mock token for development
        const mockToken = "dev_token_" + Date.now();
        sessionStorage.setItem("authToken", mockToken);
        setToken(mockToken);
        
        // Set mock user data for development
        const mockUserData = {
            "id": 7,
            "telegram_id": parseInt(process.env.REACT_APP_DEBUG_TG_ID),
            "username": "Spider",
            "first_name": "Spider",
            "last_name": null,
            "photo_url": "https://t.me/i/userpic/320/iXECxJQLkUeRwxPfKorUmfw9vydMtyxd5zu91S9RyGC0VTAIt_55bWIUPluLThKm.svg",
            "language_code": "en",
            "referral_id": 326714,
            "points": 119,
            "total_points": 126130,
            "eonx_balance": 0,
            "is_premium": 1,
            "created_at": "2025-02-10T13:38:59.000Z",
            "is_terms_accepted": 1,
            "is_first_time": 1,
            "sponsor_referral_id": 123123,
            "nft_claim": 75000,
            "online_players": 715,
            "total_blocks_mined": 74173191,
            "join_community_link": "https://t.me/eonx_airix",
            "spin_task_id": 10,
            "spin_used": 0,
            "max_spins": 1,
            "is_spin_available": true,
            "nft_minted": 4
        }
        
        setUserData(mockUserData);
        setUserLoaded(true);
        setLoading(false);
        
        // Check if this is a first-time user and if they haven't seen onboarding yet
        // const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${mockUserData.telegram_id}`);
        // if (mockUserData.is_first_time === 1 && !hasSeenOnboarding) {
        //   setShowOnboarding(true);
        // }
        return;
      }
      
      // Production mode - use real API
      const response = await axios.post(AUTH_USER, { auth: dataFromTelegram, is_cbp : true }, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.token) {
        sessionStorage.setItem("authToken", response.data.token);
        setToken(response.data.token);

        await loadUserSession(response.data.token);
        // await checkIfUserTgChannelJoined(response.data.token);

        // startFuelInterval(response.data.token);

        
      }
    } catch (error) {
      console.error("Error posting telegramData:", error.response?.data || error.message);
      
      // If API fails in development, fall back to mock data
      if (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development") {
        console.log("API failed in development mode, using mock data");
        setLoaderMessage("Using development fallback...");
        
        const mockToken = "dev_token_" + Date.now();
        sessionStorage.setItem("authToken", mockToken);
        setToken(mockToken);
        
        const mockUserData = {
          "id": 7,
          "telegram_id": parseInt(process.env.REACT_APP_DEBUG_TG_ID),
          "username": "Spider",
          "first_name": "Spider",
          "last_name": null,
          "photo_url": "https://t.me/i/userpic/320/iXECxJQLkUeRwxPfKorUmfw9vydMtyxd5zu91S9RyGC0VTAIt_55bWIUPluLThKm.svg",
          "language_code": "en",
          "referral_id": 326714,
          "points": 119,
          "total_points": 126130,
          "eonx_balance": 0,
          "is_premium": 1,
          "created_at": "2025-02-10T13:38:59.000Z",
          "is_terms_accepted": 1,
          "is_first_time": 1,
          "sponsor_referral_id": 123123,
          "nft_claim": 75000,
          "online_players": 715,
          "total_blocks_mined": 74173191,
          "join_community_link": "https://t.me/eonx_airix",
          "spin_task_id": 10,
          "spin_used": 0,
          "max_spins": 1,
          "is_spin_available": true,
          "nft_minted": 4
      }
        
        setUserData(mockUserData);
        setUserLoaded(true);
        
        // Check if this is a first-time user and if they haven't seen onboarding yet
        // const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${mockUserData.telegram_id}`);
        // if (mockUserData.is_first_time === 1 && !hasSeenOnboarding) {
        //   setShowOnboarding(true);
        // }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (telegramData && Object.keys(telegramData).length > 0) {
      sendTelegramData(telegramData);
    }
  }, [telegramData, sendTelegramData]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [subUsers, setSubUsers] = useState([]);


  const loadUserSession = async (jwt) => {
    setLoaderMessage("Fetching your data...");
    await Promise.all([
      fetchUserData(jwt),
      fetchUnreadCount(jwt),
      fetchUserSubUser(jwt),
    ]);
    setUserLoaded(true);
  };

  const fetchUnreadCount = async (token) => {
    try {
      // In development mode, skip API call
      if (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development") {
        setUnreadCount(0);
        return;
      }
      
      const response = await axios.get(GET_UNREAD_COUNT, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if(response.data.status == true) {
        setUnreadCount(response.data.count);
      }
      else {
        console.error(response.data.message);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error.response?.data || error.message);
    }
  }

  const fetchUserSubUser =async (jwt) => {
    if (!BACKEND_URL) {
      console.warn("Backend URL is not configured");
      return {
        ok: false,
        parent_user_id: null,
        sub_users: [],
      };
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/sub-users`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data?.message || `Failed to fetch sub users: ${response.status}`;
        throw new Error(errorMessage);
      }

      setSubUsers(data?.sub_users ?? []);
      
    } catch (error) {
      console.error("Error fetching sub users:", error);
      return {
        ok: false,
        parent_user_id: null,
        sub_users: [],
        error: error.message,
      };
    }
  }

  const fetchUserData = async (jwt) => {
    try {
      // In development mode, skip API call
      if (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development") {
        return; // User data already set in sendTelegramData
      }
      
      const resp = await axios.get(GET_USER, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setUserData(resp.data);
      
      // Check if this is a first-time user and if they haven't seen onboarding yet
      // const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${resp.data.telegram_id}`);
      // if (resp.data.is_first_time === 1 && !hasSeenOnboarding) {
      //   setShowOnboarding(true);
      // }
    } catch (error) {
      console.error("Error fetching user data:", error.response?.data || error.message);
    }
  };


  useEffect(() => {
    const storedToken = sessionStorage.getItem("authToken");

    if (storedToken && !userLoaded) {
      setToken(storedToken);
      loadUserSession(storedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Function to manually trigger walkthrough (for testing)
  // const triggerWalkthrough = useCallback(() => {
  //   setShowFeatureWalkthrough(true);
  // }, []);

  // Expose walkthrough trigger globally for testing
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     window.triggerWalkthrough = triggerWalkthrough;
  //     window.resetWalkthrough = () => {
  //       // Import the reset function from utils
  //       import('./utils/walkthroughUtils').then(({ resetWalkthrough }) => {
  //         resetWalkthrough(userData?.telegram_id);
  //         triggerWalkthrough();
  //       });
  //     };
  //   }
  // }, [triggerWalkthrough, userData]);

  if (loading || !userLoaded) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p style={{ color: "#fff", marginTop: "10px", fontWeight: "bold" }}> {loaderMessage}</p>
      </div>
    );
  }


  // const images = [
  //   "/story1.webp",
  //   "/story2.webp",
  //   "/story3.webp",
  //   "/story4.webp",
  //   "/story5.webp",
  // ];

  // Handle onboarding completion
  // const handleOnboardingComplete = () => {
  //   setShowOnboarding(false);
    
  //   // Save to localStorage that onboarding has been completed
  //   if (userData?.telegram_id) {
  //     localStorage.setItem(`onboarding_completed_${userData.telegram_id}`, 'true');
  //   }
    
  //   // Check if feature walkthrough has been seen before
  //   const hasSeenWalkthrough = userData?.telegram_id 
  //     ? localStorage.getItem(`feature_walkthrough_completed_${userData.telegram_id}`)
  //     : null;
    
  //   // Show feature walkthrough after onboarding is complete only if not seen before
  //   if (!hasSeenWalkthrough) {
  //     setShowFeatureWalkthrough(true);
  //   }
    
  //   console.log("Onboarding completed for user:", userData?.username);
  // };


  // Handle feature walkthrough completion
  // const handleFeatureWalkthroughComplete = () => {
  //   setShowFeatureWalkthrough(false);
    
  //   // Save to localStorage that feature walkthrough has been completed
  //   if (userData?.telegram_id) {
  //     localStorage.setItem(`feature_walkthrough_completed_${userData.telegram_id}`, 'true');
  //   }
    
  // };

  // Check if we should show the block screen (UK timezone)
  // Only check after userData is loaded
  // if (userData) {
  //   const shouldShowBlockScreen = () => {
  //     // Exempt specific telegram IDs from block screen
  //     const exemptIds = [       
  //     ];

  //     if (exemptIds.includes(userData.telegram_id)) {
  //       return false;
  //     }
      
  //     // Get current time in UK timezone
  //     const nowUK = new Date().toLocaleString('en-US', { timeZone: 'Europe/London' });
  //     const currentUKTime = new Date(nowUK);
      
  //     // Target date: October 12, 2025, 11:59:00 PM UK time
  //     const targetUKDate = new Date('2025-10-13T17:00:00');
      
  //     return currentUKTime < targetUKDate;
  //   };

  //   // If before the target date, show block screen
  //   if (shouldShowBlockScreen()) {
  //     return <BlockScreen />;
  //   }
  // }

  // Show onboarding carousel for first-time users BEFORE any app content
  // if (showOnboarding) {
  //   return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
  // }

  return (
    <div className="app">
      {!hideHeaderAndNavbar && <Header  
        unreadCount={unreadCount}  
        subUsers={subUsers}
      />}
      <Routes>
        {/* <Route path = "/" element={<Dashboard userData={userData}
          token={token}
          fetchUserData={fetchUserData} />} /> */}

        {/* <Route path = "/plan-old" element={<Plan userData={userData} />} /> */}
        <Route path = "/plan" element={<Plan2 userData={userData} />} />
        {/* <Route path = "/story" element={<StoryViewer images={images} />} /> */}
        {/* <Route path = "/tokenomics" element={<Tokenomics userData={userData} />} /> */}
        {/* <Route path = "/terms" element={<Terms userData={userData} />} /> */}
        {/* <Route path = "/terms-2" element={<Terms2 userData={userData} />} /> */}
        <Route path = "/pvc" element={<PVC userData={userData} />} />
        {/* <Route path = "/buy" element={<Buy userData={userData} />} /> */}
        {/* <Route path = "/bulk-buy" element={<BulkBuy userData={userData} token={token} />} /> */}
        <Route path = "/earnings" element={<Earnings userData={userData} />} /> 
        {/* <Route path = "/withdraw" element={<Withdraw userData={userData} />} />  */}
        <Route path = "/share-and-earn" element={<ShareAndEarn userData={userData} />} /> 
        {/* <Route path = "/claim" element={<Claim userData={userData} />} /> */}
        {/* <Route path = "/leaderboard" element={<Leaderboard userData={userData} />} />  */}
        {/* Default route to PVC */}
        <Route path = "/" element={<PVC userData={userData} />} />
      </Routes>
      {!hideHeaderAndNavbar && location.pathname !== "/dashboard" && (
        <Footer />
      )}
      {location.pathname === "/dashboard" && <Footer />}

      {/* Feature Walkthrough - shows on top of existing content */}
      {/* {showFeatureWalkthrough && (
        <FeatureWalkthrough 
          userData={userData} 
          onComplete={handleFeatureWalkthroughComplete} 
        />
      )} */}

      {/* Telegram Channel Popup */}
      {/* <TelegramChannelPopup 
        isOpen={showTelegramChannelPopup}
        onClose={() => setShowTelegramChannelPopup(false)}
      /> */}

    </div>
  );
}

export default function AppWrapper() {
  return (
    <AppKitProvider>
      <Router>
        <Routes>
            {/* All other routes, under TelegramProvider */}
          <Route path="/*" element={
            <TelegramProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </TelegramProvider>
          } />
        </Routes>
      </Router>
    </AppKitProvider>
  );
}
