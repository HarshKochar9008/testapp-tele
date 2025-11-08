import React, { useMemo, useState, useEffect, useRef } from "react";
import "./PVC.css";
import { useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
// import { openTelegramBot, openTelegramChat } from "../../utils/telegramUtils";
import { openTelegramChat } from "../../utils/telegramUtils";
import { MessageSquareText } from "lucide-react";
// import BuyTokenPopup from "../../components/BuyTokenPopup/BuyTokenPopup";
// import useCBPInstructionsPopup from "../../hooks/useCBPInstructionsPopup";
const ENV = (typeof process !== "undefined" && process.env) ? process.env : {};

/** ===================== Supabase (CRA envs) ===================== **/
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const SB_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON);
const supabase = SB_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
  : null;

if (!SB_ENABLED) {
  console.warn("[Supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY.");
}

/** ===== Invite code helpers (removed - no longer needed) ===== */


// Check if user is registered using telegram_id
async function sbGetUserByTelegramId(telegramId) {
  if (!SB_ENABLED || !telegramId) {
    return null;
  }
  
  const { data, error } = await supabase
    .from("cbp_users")
    .select("id, telegram_id, wallet_address, invite_url, ref_code")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  
  if (error && error.code !== "PGRST116") {
    console.error("[Supabase] get user by telegram_id failed:", error);
  }
  
  const result = data || null;
  return result;
}

// Map code -> referrer wallet (used to call register(referrer))
async function sbGetWalletByCode(code) {
  if (!SB_ENABLED || !code) return null;
  const { data, error } = await supabase
    .from("cbp_users")
    .select("wallet_address")
    .eq("ref_code", code.toUpperCase())
    .maybeSingle();
  if (error && error.code !== "PGRST116") console.error("[Supabase] get wallet by code failed:", error);
  return data?.wallet_address?.toLowerCase() || null;
}


// Get referrals for any user (used in tree navigation)
async function sbGetUserReferrals(userId) {
  if (!SB_ENABLED || !userId) {
    return [];
  }
  
  try {
    // Get direct referrals first
    const { data: referrals, error: referralsError } = await supabase
      .from("cbp_referrals")
      .select("referee_id, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: true });
    
    if (referralsError) {
      console.error("[Supabase] get user referrals failed:", referralsError);
      return [];
    }
    
    
    if (!referrals || referrals.length === 0) {
      return [];
    }
    

   
    
    // Get user details for each referee using batched approach
    const refereeIds = referrals.map(r => r.referee_id);
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < refereeIds.length; i += batchSize) {
      batches.push(refereeIds.slice(i, i + batchSize));
    }
    
    let allUsers = [];
    for (const batch of batches) {
      const { data: users, error: usersError } = await supabase
        .from("cbp_users")
        .select("id, ref_code, created_at, telegram_username, wallet_address, gvm_index")
        .in("id", batch);

      if (usersError) {
        console.error("[Supabase] get users batch failed:", usersError);
        continue;
      } 
      
      allUsers = [...allUsers, ...(users || [])];
    }
    
    // Process the data
    return referrals.map((referral, index) => {
      const user = allUsers.find(u => u.id === referral.referee_id);
      return {
        sr_no: index + 1,
        id: user?.id || referral.referee_id, // Ensure we have an id
        username: user?.telegram_username || `User_${referral.referee_id.slice(0, 8)}`,
        address: user?.wallet_address,
        joined_at: referral.created_at,
        user_data: user,
        user_id: referral.referee_id
      };
    });
    
  } catch (error) {
    console.error("[Supabase] get user referrals threw:", error);
    return [];
  }
}

// Get direct referrals for a user by their user ID
async function sbGetDirectReferrals(telegramUserData) {
  try {

    let allReferrals = [];
    let from = 0;
    const limit = 1000;
    let done = false;

    while (!done) {
      const { data, error } = await supabase
        .from("cbp_referrals")
        .select("referee_id, created_at")
        .eq("referrer_id", telegramUserData.id)
        .order("created_at", { ascending: true })
        .range(from, from + limit - 1);

      if (error) {
        console.error(error);
        break;
      }

      if (data.length === 0) {
        done = true;
      } else {
        allReferrals = allReferrals.concat(data);
        from += limit;
        if (data.length < limit) done = true; // last page
      }
    }


    const referrals = allReferrals;
        
    
    if (!referrals || referrals.length === 0) {
      return [];
    }
    
    // Get user details for each referee using a more efficient approach
    const refereeIds = referrals.map(r => r.referee_id);
    
    // Use a single query with IN clause but limit the batch size
    const batchSize = 100; // Process in batches to avoid query limits
    const batches = [];
    for (let i = 0; i < refereeIds.length; i += batchSize) {
      batches.push(refereeIds.slice(i, i + batchSize));
    }
    
    let allUsers = [];
    for (const batch of batches) {
      const { data: users, error: usersError } = await supabase
        .from("cbp_users")
        .select("id, ref_code, created_at, telegram_username, wallet_address, has_bought, gvm_index")
        .in("id", batch);
      
      if (usersError) {
        console.error("[Supabase] get users batch failed:", usersError);
        continue; // Skip this batch but continue with others
      }
    
      allUsers = [...allUsers, ...(users || [])];
    }
    
    // Process the data
    const directReferrals = referrals.map((referral, index) => {
      const user = allUsers.find(u => u.id === referral.referee_id);
      return {
        sr_no: index + 1,
        id: user?.id,
        username: user?.telegram_username || `User_${referral.referee_id.slice(0, 8)}`,
        address: user?.wallet_address,
        joined_at: referral.created_at,
        user_data: user,
        has_bought: user?.has_bought,
        gvm_index:user?.gvm_index
      };
    });
    
    return directReferrals;
    
  } catch (error) {
    console.error("[Supabase] get direct referrals threw:", error);
    return [];
  }
}


async function sbRefreshCountsAll() {
  if (!SB_ENABLED) return;
  try {
    const { error } = await supabase.rpc("fn_refresh_referral_counts");
    if (error) console.error("[Supabase] fn_refresh_referral_counts failed:", error);
  } catch (e) {
    console.error("[Supabase] refresh RPC threw:", e);
  }
}

// Helper function to format wallet addresses
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

/** ====================================================================== **/

export default function PVC({ userData }) {

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const urlRefCode = params.get("code") || ""; // codes only
  // const { showPopup, closePopup } = useCBPInstructionsPopup();

  /** ===== Neon modal state ===== */
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const resolveReferralPromise = useRef(null);

  const askReferralCode = () =>
    new Promise((resolve) => {
      resolveReferralPromise.current = resolve;
      setReferralInput("");
      setShowReferralModal(true);
    });

  const handleReferralSubmit = () => {
    setShowReferralModal(false);
    if (resolveReferralPromise.current) {
      resolveReferralPromise.current(referralInput.trim().toUpperCase());
      resolveReferralPromise.current = null;
    }
  };

  const handleReferralCancel = () => {
    setShowReferralModal(false);
    if (resolveReferralPromise.current) {
      resolveReferralPromise.current(null);
      resolveReferralPromise.current = null;
    }
  };

  /** ===== Toast state ===== */
  const [toasts, setToasts] = useState([]);
  const showToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Telegram registration status
  const [isTelegramRegistered, setIsTelegramRegistered] = useState(false);
  const [telegramUserData, setTelegramUserData] = useState(null);
  const [loadingTelegramReg, setLoadingTelegramReg] = useState(true);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);

  // Direct referrals state
  const [directReferrals, setDirectReferrals] = useState([]);
  const [paidDirectReferrals, setPaidDirectReferrals] = useState([]);
  const [loadingDirectReferrals, setLoadingDirectReferrals] = useState(false);
  
  // const [hasBought, setHasBought] = useState(false);
  // const [isLoadingPurchase, setIsLoadingPurchase] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState('free'); // 'free' or 'paid'

  // Referral tree popup state
  const [showReferralTree, setShowReferralTree] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [referralTree, setReferralTree] = useState([]);
  const [loadingReferralTree, setLoadingReferralTree] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [treeLevel, setTreeLevel] = useState(0);


  // Check telegram registration status on component mount
  useEffect(() => {
    const checkTelegramRegistration = async () => {
      if (!userData?.telegram_id) {
        setLoadingTelegramReg(false);
        return;
      }

      let userFound = false;
      
      try {
        setLoadingTelegramReg(true);

        console.log("userData.telegram_id", userData.telegram_id)
        const telegramUser = await sbGetUserByTelegramId(userData.telegram_id);
        
        if (telegramUser) {
          setIsTelegramRegistered(true);
          setTelegramUserData(telegramUser);
          setHasExistingWallet(!!telegramUser.wallet_address);
          userFound = true;
        } else {
          setIsTelegramRegistered(false);
          setTelegramUserData(null);
          setHasExistingWallet(false);
        }
      } catch (error) {
        console.error("Error checking telegram registration:", error);
        // Only set to false if we haven't successfully determined the user is registered
        // This prevents overriding a successful registration check due to subsequent errors
        if (!userFound) {
          setIsTelegramRegistered(false);
          setTelegramUserData(null);
          setHasExistingWallet(false);
        }
      } finally {
        setLoadingTelegramReg(false);
      }
    };

    checkTelegramRegistration();
  }, [userData?.telegram_id]);



  // Load direct referrals when user is registered
  useEffect(() => {
    const loadDirectReferrals = async () => {
      if (!isTelegramRegistered || !telegramUserData?.id) {
        return;
      }

      try {
        setLoadingDirectReferrals(true);        
        const referrals = await sbGetDirectReferrals(telegramUserData);
        const freeReferrals = referrals.filter(referral => !referral.has_bought);
        const paidReferrals = referrals.filter(referral => referral.has_bought);
        setDirectReferrals(freeReferrals);

        paidReferrals.sort((a, b) => a.gvm_index - b.gvm_index);
        setPaidDirectReferrals(paidReferrals);
      } catch (error) {
        console.error("Error loading direct referrals:", error);
        setDirectReferrals([]);
      } finally {
        setLoadingDirectReferrals(false);
      }
    };

    loadDirectReferrals();
  }, [isTelegramRegistered, telegramUserData?.id]);

  // Fetch has_bought for current user by telegram_id to control BuyTokenPopup
  // useEffect(() => {
  //   const checkPurchaseStatus = async () => {
  //     if (!SB_ENABLED || !userData?.telegram_id) {
  //       setIsLoadingPurchase(false);
  //       return;
  //     }

  //     try {
  //       setIsLoadingPurchase(true);
  //       const { data, error } = await supabase
  //         .from("cbp_users")
  //         .select("has_bought")
  //         .eq("telegram_id", userData.telegram_id)
  //         .maybeSingle();

  //       if (error && error.code !== "PGRST116") {
  //         console.error("[Supabase] check has_bought failed:", error);
  //         setHasBought(false);
  //       } else {
  //         setHasBought(data?.has_bought === true);
  //       }
  //     } catch (e) {
  //       console.error("[Supabase] check has_bought threw:", e);
  //       setHasBought(false);
  //     } finally {
  //       setIsLoadingPurchase(false);
  //     }
  //   };

  //   checkPurchaseStatus();
  // }, [userData?.telegram_id]);

  const [note, setNote] = useState("");

  // UI state for referral code
  const [myCode, setMyCode] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // Only used after successful registration to refresh DB analytics
  const scheduleRefreshCounts = () => {
    if (!SB_ENABLED) return;
    setTimeout(() => sbRefreshCountsAll(), 1000);
  };

  /** Read existing code (no writes) when user is telegram registered */
  useEffect(() => {
    (async () => {
      if (!isTelegramRegistered || !telegramUserData) return;
      
      // Check if user already has a ref_code in their telegram data
      if (telegramUserData.ref_code) {
        setMyCode(telegramUserData.ref_code);
        return;
      }
      
      // Check if this is the owner (first user in table)
      const { data: allUsers, error: allUsersError } = await supabase
        .from("cbp_users")
        .select("wallet_address, ref_code, telegram_id")
        .order("wallet_address", { ascending: true })
        .limit(1);
      
      
      const isOwner = allUsers && allUsers.length > 0 && 
                     allUsers[0].telegram_id === userData?.telegram_id;
      
      if (isOwner && allUsers[0].ref_code) {
        setMyCode(allUsers[0].ref_code);
        setIsOwner(true);
      } else {
        setIsOwner(isOwner);
      }
    })();
  }, [isTelegramRegistered, telegramUserData]);

  // codes only (no address referral)
  const resolveReferrer = async () => {
    const codeFromUrl = urlRefCode?.trim().toUpperCase();
    if (codeFromUrl) {
      const w = await sbGetWalletByCode(codeFromUrl);
      if (!w) { showToast("Invalid or unknown referral code."); return null; }
      return w;
    }
    const input = await askReferralCode();
    if (!input) return null;
    if (!/^[A-Z0-9]{4}$/.test(input)) { showToast("Invalid referral code format."); return null; }
    const w = await sbGetWalletByCode(input);
    if (!w) { showToast("Unknown referral code."); return null; }
    return w;
  };

  const inviteUrl = useMemo(() => {
    const base = "https://t.me/eonx_cbp_bot?start=";
    return isTelegramRegistered && myCode ? `${base}${myCode}` : "";
  }, [isTelegramRegistered, myCode]);

  const copyInvite = async () => {
    if (!isTelegramRegistered || !myCode) {
      setNote("You need to be registered via Telegram to get your invite code.");
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    setNote("Invitation link copied to clipboard!");
  };

  // Contact head functionality
  // const contactHead = async () => {
  //   if (!isTelegramRegistered) {
  //     showToast("You need to be registered via Telegram to contact the head.");
  //     return;
  //   }
    
  //   // Use the utility function to open Telegram bot (static import at top)
  //   await openTelegramBot("Eonxx_bot", showToast);
  // };

  // Handle username click to show referral tree
  const handleUsernameClick = async (referral) => {
    setCurrentUser(referral);
    setShowReferralTree(true);
    setLoadingReferralTree(true);
    setBreadcrumbs([{ name: "You", id: telegramUserData.id }, { name: referral.username, id: referral.id }]);
    setTreeLevel(1);
    
    try {
      const referrals = await sbGetUserReferrals(referral.id);
      setReferralTree(referrals);
    } catch (error) {
      console.error("Error loading referral tree:", error);
      setReferralTree([]);
    } finally {
      setLoadingReferralTree(false);
    }
  };

  // Navigate to a specific user in the tree
  const navigateToUser = async (user, level) => {
    setCurrentUser(user);
    setLoadingReferralTree(true);
    
    // Update breadcrumbs
    const newBreadcrumbs = breadcrumbs.slice(0, level + 1);
    newBreadcrumbs.push({ name: user.username, id: user.id });
    setBreadcrumbs(newBreadcrumbs);
    setTreeLevel(level + 1);
    
    try {
      const referrals = await sbGetUserReferrals(user.id);
      setReferralTree(referrals);
    } catch (error) {
      console.error("Error loading referrals for user:", error);
      setReferralTree([]);
    } finally {
      setLoadingReferralTree(false);
    }
  };

  // Navigate back using breadcrumbs
  const navigateBack = async (breadcrumbIndex) => {
    if (breadcrumbIndex === 0) {
      // Go back to main direct referrals
      setShowReferralTree(false);
      setCurrentUser(null);
      setBreadcrumbs([]);
      setTreeLevel(0);
      return;
    }
    
    const targetBreadcrumb = breadcrumbs[breadcrumbIndex];
    setLoadingReferralTree(true);
    
    // Update breadcrumbs
    const newBreadcrumbs = breadcrumbs.slice(0, breadcrumbIndex + 1);
    setBreadcrumbs(newBreadcrumbs);
    setTreeLevel(breadcrumbIndex);
    
    try {
      const referrals = await sbGetUserReferrals(targetBreadcrumb.id);
      setReferralTree(referrals);
      setCurrentUser({ username: targetBreadcrumb.name, user_id: targetBreadcrumb.id });
    } catch (error) {
      console.error("Error navigating back:", error);
      setReferralTree([]);
    } finally {
      setLoadingReferralTree(false);
    }
  };

  // Close referral tree popup
  const closeReferralTree = () => {
    setShowReferralTree(false);
    setCurrentUser(null);
    setReferralTree([]);
    setBreadcrumbs([]);
    setTreeLevel(0);
  };

  // Handle message icon click to open chat
  const handleMessageClick = async (username) => {
    
    if (!isTelegramRegistered) {
      showToast("You need to be registered via Telegram to send messages.");
      return;
    }
    
    // Check if username is a fallback username (starts with "User_")
    if (username.startsWith("User_")) {
      showToast("This user hasn't set up their Telegram username yet.");
      return;
    }
    
    // Use the utility function to open Telegram chat
    await openTelegramChat(username, showToast);
  };

  const wrongChain = false; // No longer using blockchain

  return (
    <div>
      <div className="pvc-page">
        {/* Greeting Section */}
        <div className="greeting-section">
          <h1>
            Hi! {userData?.username || "George"}{" "}
          </h1>
          {/* <div className="global-stats">
            <div className="stats-number">0+</div>
            <div className="stats-label">Global Virality iEX Buyers</div>
          </div> */}
        </div>

        {/* CBP Registration status + wallet controls */}
        {/* <div className="pvc-section">
          <div className="section-header">
            <div className="header-left">
              <div className="section-icon">
                <img src="arrow_end.svg" alt="Arrow" />
              </div>
              <span>
                CBP <span className="pvc-highlight">Registration</span>
              </span>
            </div>
            <div className="header-right">
              {loadingTelegramReg ? (
                <span className="amount">Checking registration...</span>
              ) : !isTelegramRegistered ? (
                <span className="amount">Not registered via Telegram</span>
              ) : (
                <span className="amount">
                  Registered ✅ • {telegramUserData?.wallet_address ? short(telegramUserData.wallet_address) : "No wallet"}
                </span>
              )}
            </div>
          </div>
          {loadingTelegramReg ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div>Checking your registration status...</div>
            </div>
          ) : !isTelegramRegistered ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", fontSize: "16px", fontWeight: "bold" }}>
                You are not registered via Telegram
              </div>
              <div style={{ fontSize: "14px", opacity: 0.8 }}>
                Please register through the Telegram bot to access team details and referral features.
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ marginBottom: "12px", fontSize: "16px", fontWeight: "bold" }}>
                Welcome! You are registered via Telegram
              </div>
              <div style={{ fontSize: "14px", opacity: 0.8 }}>
                {telegramUserData?.wallet_address ? 
                  `Wallet: ${short(telegramUserData.wallet_address)}` : 
                  "No wallet address registered yet"
                }
              </div>
            </div>
          )}
        </div> */}
        {/* Contact Head Section */}
        {isTelegramRegistered && (
          <div className="invitation-section">
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
            
              <button className="invitation-button" onClick={copyInvite} disabled={!isTelegramRegistered || !myCode}>
                {isTelegramRegistered ? (myCode ? "Copy Invitation Link" : "Preparing your code…") : "Register via Telegram to get your code"}
              </button>
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              {isOwner && (
                <div style={{ color: "#FFD700", fontWeight: "bold", marginBottom: 4 }}>
                  👑 Owner Account Detected
                </div>
              )}
              {isTelegramRegistered && myCode ? (
                <div>
                  <div>Your referral code: <strong>{myCode}</strong></div>
                  <div style={{ marginTop: 4 }}>Invite link: {inviteUrl}</div>
                </div>
              ) : (
                "Your invite link appears after Telegram registration."
              )}
            </div>
            {note && (
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>{note}</div>
            )}
          </div>
        )}
        {/* Direct referrals (level-1) with tabs */}
        {isTelegramRegistered && (
          <div className="pvc-section">
            <div className="section-header">
              <div className="header-left">
                <div className="section-icon">
                  <img src="arrow_end.svg" alt="Arrow" />
                </div>
                <span>
                 PVC Viral  <span className="pvc-highlight">Circle</span>
                </span>
              </div>
              <div className="header-right">
                <span className="amount">
                  {loadingDirectReferrals ? "…" : (activeTab === 'free' ? directReferrals.length : paidDirectReferrals.length)}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="referral-tabs">
              <button 
                className={`tab-button ${activeTab === 'free' ? 'active' : ''}`}
                onClick={() => setActiveTab('free')}
              >
                Free Referrals
                <span className="tab-count">{directReferrals.length}</span>
              </button>
              <button 
                className={`tab-button ${activeTab === 'paid' ? 'active' : ''}`}
                onClick={() => setActiveTab('paid')}
              >
                PVC
                <span className="tab-count">{paidDirectReferrals.length}</span>
              </button>
            </div>

            {/* Table for active tab */}
            <div className="user-table">
              <div className="table-header">
                <div className="table-cell">Sr. No</div>
                <div className="table-cell">Username</div>
                <div className="table-cell">Address</div>
                <div className="table-cell">Registered On</div>
              </div>
              {activeTab === 'free' ? (
                // Free Referrals
                directReferrals.length === 0 ? (
                  <div className="table-row">
                    <div className="table-cell">
                      {loadingDirectReferrals
                        ? "Loading referrals..."
                        : "No free referrals yet"}
                    </div>
                  </div>
                ) : (
                  directReferrals.map((referral, index) => (
                    <div className="table-row" key={`free-${referral.id || referral.address || index}`}>
                      <div className="table-cell">
                        {index + 1}
                        <span 
                          className="message-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(referral.username);
                          }}
                          style={{
                            cursor: referral.username.startsWith("User_") ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            color: referral.username.startsWith("User_") ? '#666' : '#00FF00',
                            transition: 'color 0.2s ease',
                            opacity: referral.username.startsWith("User_") ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#55ff55';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#00FF00';
                            }
                          }}
                          title={referral.username.startsWith("User_") ? "User hasn't set up Telegram username" : "Send message"}
                        >
                          <MessageSquareText/>
                        </span>
                      
                      </div>
                      <div 
                        className="table-cell" 
                        style={{ 
                          cursor: 'pointer', 
                          color: '#00FF00', 
                          textDecoration: 'underline', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word'
                        }}
                        onClick={() => handleUsernameClick(referral)}
                        title="Click to view referrals"
                      >
                        {referral.username}
                      </div>
                      <div className="table-cell">{short(referral.address)}</div>
                      <div className="table-cell">
                        {new Date(referral.joined_at).toLocaleDateString("en-US")}
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Paid Referrals
                paidDirectReferrals.length === 0 ? (
                  <div className="table-row">
                    <div className="table-cell">
                      {loadingDirectReferrals
                        ? "Loading referrals..."
                        : "No paid referrals yet"}
                    </div>
                  </div>
                ) : (
                  paidDirectReferrals.map((referral, index) => (
                    <div className="table-row" key={`paid-${referral.id || referral.address || index}`}>
                      <div className="table-cell">
                        <span 
                          className="message-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(referral.username);
                          }}
                          style={{
                            cursor: referral.username.startsWith("User_") ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            color: referral.username.startsWith("User_") ? '#666' : '#00FF00',
                            transition: 'color 0.2s ease',
                            opacity: referral.username.startsWith("User_") ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#55ff55';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#00FF00';
                            }
                          }}
                          title={referral.username.startsWith("User_") ? "User hasn't set up Telegram username" : "Send message"}
                        >
                          <MessageSquareText/>
                        </span>
                      </div>
                      <div 
                        className="table-cell" 
                        style={{ 
                          cursor: 'pointer', 
                          color: '#00FF00', 
                          textDecoration: 'underline', 
                          whiteSpace: 'normal', 
                          wordWrap: 'break-word'
                        }}
                        onClick={() => handleUsernameClick(referral)}
                        title="Click to view referrals"
                      >
                        {referral.username}
                      </div>
                      <div className="table-cell">{short(referral.address)}</div>
                      <div className="table-cell">
                        {new Date(referral.joined_at).toLocaleDateString("en-US")}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}

        
      </div>

      <div className="bottom-section">
        <img
          src="/avatar-image-bottom.png"
          alt="Center Image"
          className="center-image"
        />
      </div>

      {/* Referral Tree Popup */}
      {showReferralTree && (
        <div className="referral-tree-backdrop">
          <div className="referral-tree-modal">
            {/* Header with breadcrumbs */}
            <div className="referral-tree-header">
              <div className="breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`breadcrumb-${crumb.id || index}`}>
                    <span 
                      className="breadcrumb-link"
                      onClick={() => navigateBack(index)}
                      style={{ 
                        cursor: index < breadcrumbs.length - 1 ? 'pointer' : 'default',
                        color: index < breadcrumbs.length - 1 ? '#00FF00' : '#666',
                        textDecoration: index < breadcrumbs.length - 1 ? 'underline' : 'none'
                      }}
                    >
                      {crumb.name}
                    </span>
                    {index < breadcrumbs.length - 1 && <span className="breadcrumb-separator"> → </span>}
                  </span>
                ))}
              </div>
              <button className="close-button" onClick={closeReferralTree}>×</button>
            </div>

            {/* Current user info */}
            <div className="current-user-info">
              <h3>Referrals of: {currentUser?.username}</h3>
              <div className="level-indicator">Level {treeLevel}</div>
            </div>

            {/* Referrals table */}
            <div className="referral-tree-content">
              {loadingReferralTree ? (
                <div className="loading-state">Loading referrals...</div>
              ) : referralTree.length === 0 ? (
                <div className="empty-state">No referrals found</div>
              ) : (
                <div className="user-table">
                  <div className="table-header">
                    <div className="table-cell">Sr. No</div>
                    <div className="table-cell">Username</div>
                    <div className="table-cell">Address</div>
                    <div className="table-cell">Registered On</div>
                  </div>
                  {referralTree.map((referral, index) => (
                    <div className="table-row" key={`tree-${referral.user_id || referral.address || index}`}>
                      <div className="table-cell">{referral.sr_no}</div>
                      <div 
                        className="table-cell" 
                        style={{ 
                          cursor: 'pointer', 
                          color: '#00FF00', 
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={() => navigateToUser(referral, treeLevel)}
                        title="Click to view referrals"
                      >
                        <span 
                          className="message-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(referral.username);
                          }}
                          style={{
                            cursor: referral.username.startsWith("User_") ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            color: referral.username.startsWith("User_") ? '#666' : '#00FF00',
                            transition: 'color 0.2s ease',
                            opacity: referral.username.startsWith("User_") ? 0.5 : 1,
                            marginLeft: '8px'
                          }}
                          onMouseEnter={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#55ff55';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!referral.username.startsWith("User_")) {
                              e.target.style.color = '#00FF00';
                            }
                          }}
                          title={referral.username.startsWith("User_") ? "User hasn't set up Telegram username" : "Send message"}
                        >
                          <MessageSquareText/>
                        </span>
                        {referral.username}
                      </div>
                      <div className="table-cell">{short(referral.address)}</div>
                      <div className="table-cell">
                        {new Date(referral.joined_at).toLocaleDateString("en-US")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Neon Referral Modal */}
      {showReferralModal && (
        <div className="referral-modal-backdrop">
          <div className="referral-modal">
            <h3>Enter Referral Code</h3>
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              placeholder="e.g. A7KQ"
              maxLength={4}
            />
            <div>
              <button onClick={handleReferralSubmit}>Submit</button>
              <button onClick={handleReferralCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
      
      {/* Buy Token Popup - only when user has not purchased */}
      {/* <BuyTokenPopup isOpen={showPopup && !hasBought} onClose={closePopup} /> */}
    </div>
  );
}