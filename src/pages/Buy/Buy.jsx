import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Buy.css";
import { useAppKit } from "@reown/appkit/react";
import {
  useAccount,
  useBalance,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { bsc } from "wagmi/chains";
import {
  parseUnits,
  isAddress as viemIsAddress,
} from "viem";
import { ethers } from "ethers";
import saleArtifact from "../../abi/EonXSale.json";

/* ==== Full Sale ABI for accurate buy() + custom error decoding ==== */
const SALE_ABI = saleArtifact.abi;

/* ==== CRA envs ==== */
const ENV = (typeof process !== "undefined" && process.env) ? process.env : {};
const USDT_ADDRESS =
  ENV.REACT_APP_USDT ||
  ENV.REACT_APP_TOKEN_ADDRESS ||
  "";
const SALE_ADDRESS =
  ENV.REACT_APP_SALE ||
  ENV.REACT_APP_SALE_ADDRESS ||
  "";

/* >>> CBP address fallback. */
const CBP_ADDRESS_FALLBACK =
  ENV.REACT_APP_CBP_ADDRESS ||
  "0x63fd54A435F5068307424977f4E9150940433202";

/* ==== minimal ERC20 ABI ==== */
const ERC20_ABI = [
  { type: "function", name: "decimals",   stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol",     stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf",  stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance",  stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve",    stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];

/* ==== CBP ABI ==== */
const CBP_ABI = [
  { type: "function", name: "isRegistered", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "getTopId", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "referrerOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "address" }] },
];

/* ==== Bulk eligibility ==== */
const parseBulkAllowedTelegramIds = () => {
  const rawIds = ENV.REACT_APP_BULK_TELEGRAM_IDS || "";
  const ids = rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const debugId = ENV.REACT_APP_DEBUG_TG_ID ? String(ENV.REACT_APP_DEBUG_TG_ID).trim() : null;
  if (debugId && !ids.includes(debugId)) {
    ids.push(debugId);
  }
  return new Set(ids);
};
const BULK_ALLOWED_TELEGRAM_IDS = parseBulkAllowedTelegramIds();

/* ==== helpers ==== */
const ZERO = "0x0000000000000000000000000000000000000000";
const toNum = (v) => Number(v ?? 0n);
const fmtNative3 = (val) => {
  const n = Number(val ?? 0);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};
const fmtUsdtInt = (val) => {
  const n = Number(val ?? 0);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "0";
};

/** Contract cap schedule (USDT, not token units) for buyer index (1-based) */
function capForBuyerIndex(id) {
  return 30;
}

export default function Buy({ userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lastApproveHash, setLastApproveHash] = useState(null);
  const [hasApproved, setHasApproved] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [buyTxHash, setBuyTxHash] = useState(null);
  const [isProcessingBoth, setIsProcessingBoth] = useState(false);
  const [transactionState, setTransactionState] = useState('idle'); // 'idle', 'registering', 'registered', 'approving', 'approved', 'buying', 'purchased'
  const [backendCapUnits, setBackendCapUnits] = useState(null); // Cap from backend response
  const [buyType, setBuyType] = useState('single'); // 'single' or 'bulk'
  const dropdownRef = useRef(null);
  
  // Reset function to clear previous errors and states
  const resetTransactionState = () => {
    setTransactionState('idle');
    setIsProcessingBoth(false);
    setHasApproved(false);
    setHasPurchased(false);
    setBuyTxHash(null);
    setLastApproveHash(null);
    setBackendCapUnits(null);
  };

  // ---- Toasts ----
  const [toasts, setToasts] = useState([]);
  const showToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: bsc.id });
  const { data: walletClient } = useWalletClient();

  /* native balance (BNB on BSC) */
  const { data: nativeBal, isLoading: nativeLoading } = useBalance({
    address,
    chainId: bsc.id,
    watch: true,
  });
  const nativeLabel = nativeBal?.symbol || "BNB";

  /* USDT metadata + balances */
  const { data: usdtDecimals } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!USDT_ADDRESS },
  });
  const { data: usdtSymbol } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!USDT_ADDRESS },
  });

  const isBulkBuyAvailable = useMemo(() => {
    if (!userData?.telegram_id) {
      return false;
    }
    return BULK_ALLOWED_TELEGRAM_IDS.has(String(userData.telegram_id));
  }, [userData?.telegram_id]);

  useEffect(() => {
    if (!isBulkBuyAvailable && buyType === "bulk") {
      setBuyType("single");
    }
  }, [isBulkBuyAvailable, buyType]);
  const {
    data: usdtBal,
    isLoading: usdtLoading,
    refetch: refetchUsdtBal
  } = useBalance({
    address,
    token: USDT_ADDRESS,
    chainId: bsc.id,
    watch: true,
    enabled: Boolean(address && USDT_ADDRESS),
  });

  /* ===== Sale reads ===== */
  const { data: saleActive } = useReadContract({
    address: SALE_ADDRESS,
    abi: SALE_ABI,
    functionName: "saleActive",
    query: { enabled: !!SALE_ADDRESS },
  });

  const { data: buyerCount } = useReadContract({
    address: SALE_ADDRESS,
    abi: SALE_ABI,
    functionName: "buyerCount",
    query: { enabled: !!SALE_ADDRESS },
  });

  const { data: already, isLoading: alreadyLoading, error: alreadyError } = useReadContract({
    address: SALE_ADDRESS,
    abi: SALE_ABI,
    functionName: "hasPurchased",
    args: [address ?? ZERO],
    query: { 
      enabled: Boolean(SALE_ADDRESS && address),
      retry: false, // Don't retry on failure
      refetchInterval: false, // Don't auto-refetch
    },
  });


  /* Try to read CBP from Sale; if missing, use fallback */
  const { data: cbpFromSale } = useReadContract({
    address: SALE_ADDRESS,
    abi: SALE_ABI,
    functionName: "cbp",
    query: { enabled: !!SALE_ADDRESS },
  });

  const effectiveCbp = useMemo(() => {
    if (cbpFromSale && viemIsAddress(cbpFromSale)) return cbpFromSale;
    if (CBP_ADDRESS_FALLBACK && viemIsAddress(CBP_ADDRESS_FALLBACK)) return CBP_ADDRESS_FALLBACK;
    console.warn("[Buy] No valid CBP address: provide REACT_APP_CBP_ADDRESS or expose cbp() in Sale.");
    return ZERO;
  }, [cbpFromSale]);

  /* Registration check using effective CBP */
  const { data: isRegistered } = useReadContract({
    address: effectiveCbp,
    abi: CBP_ABI,
    functionName: "isRegistered",
    args: [address ?? ZERO],
    query: { enabled: Boolean(address && viemIsAddress(effectiveCbp) && effectiveCbp !== ZERO) },
  });

  /* Get top ID for registration */
  const { data: topId } = useReadContract({
    address: effectiveCbp,
    abi: CBP_ABI,
    functionName: "getTopId",
    query: { enabled: Boolean(viemIsAddress(effectiveCbp) && effectiveCbp !== ZERO) },
  });

  /* CBP registration hook */
  const {
    writeContract: writeRegister,
    data: registerHash,
    isPending: registering,
  } = useWriteContract();

  const {
    isLoading: registerMining,
    isSuccess: registered,
  } = useWaitForTransactionReceipt({ hash: registerHash });

  /* ===== Allowance to SALE ===== */
  const {
    data: allowanceSale,
    refetch: refetchAllowanceSale
  } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? ZERO, SALE_ADDRESS ?? ZERO],
    query: { enabled: Boolean(address && USDT_ADDRESS && SALE_ADDRESS) },
  });

  /* ===== writers ===== */
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: approving,
  } = useWriteContract();
  const {
    isLoading: approveMining,
    isSuccess: approved,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  /* ===== USDT approval hook ===== */
  const {
    writeContract: writeUSDTApprove,
    data: usdtApproveHash,
    isPending: usdtApproving,
    error: usdtApproveError,
  } = useWriteContract();
  const {
    isLoading: usdtApproveMining,
    isSuccess: usdtApproved,
    error: usdtApproveReceiptError,
  } = useWaitForTransactionReceipt({ hash: usdtApproveHash });

  /* ===== Purchase transaction hook ===== */
  const {
    writeContract: writeBuy,
    data: buyTxHashFromHook,
    isPending: buying,
    error: buyError,
  } = useWriteContract();
  const {
    isLoading: buyMining,
    isSuccess: bought,
    error: buyReceiptError,
  } = useWaitForTransactionReceipt({ hash: buyTxHashFromHook });

  // Buy hooks removed - using backend integration instead

  /* helpers */
  const ensureBsc = async () => {
    if (!isConnected) {
      showToast("Connect your wallet first.");
      return false;
    }
    if (chainId !== bsc.id) {
      try {
        await switchChainAsync({ chainId: bsc.id });
      } catch {
        showToast("Please switch to BSC in the wallet modal.");
        open({ view: "Networks", namespace: "eip155" });
        return false;
      }
    }
    return true;
  };

  /* ===== Dynamic cap per contract rules ===== */
  const usdtDec = Number(usdtDecimals ?? 18);
  const nextBuyerIndex = useMemo(() => toNum(buyerCount) + 1, [buyerCount]);
  const capUSDT = useMemo(() => capForBuyerIndex(nextBuyerIndex), [nextBuyerIndex]);
  
  // Use backend cap if available, otherwise calculate locally
  const capUnits = useMemo(() => {
    if (backendCapUnits) {
      console.log("🔍 Using backend cap:", backendCapUnits.toString());
      return BigInt(backendCapUnits); // eslint-disable-line no-undef
    }
    
    try { 
      const localCap = parseUnits(String(capUSDT), usdtDec);
      console.log("🔍 Using local cap:", localCap.toString());
      return localCap; 
    } catch { 
      console.log("❌ Failed to calculate local cap");
      return null; 
    }
  }, [backendCapUnits, capUSDT, usdtDec]);

  /* ===== Allowance/balance checks vs dynamic cap ===== */
  const allowSaleOk = useMemo(() => {
    if (allowanceSale == null || capUnits == null) return false;
    // Add a small buffer to account for potential rounding issues
    const buffer = capUnits / 1000n; // 0.1% buffer
    return allowanceSale >= (capUnits + buffer);
  }, [allowanceSale, capUnits]);

  const balanceOk = useMemo(() => {
    if (!usdtBal?.value || capUnits == null) return false;
    return usdtBal.value >= capUnits;
  }, [usdtBal?.value, capUnits]);



  // ---- Backend config ----
  const BACKEND_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ??
    process.env.REACT_APP_BACKEND_URL ??
    "";

  // Helper function to decode custom errors
  const decodeCustomError = (error) => {
    if (error?.data) {
      const errorData = error.data;
      // Map known error selectors to human-readable messages
      const errorMap = {
        "0x13be252b": "Insufficient USDT allowance. Please approve USDT first.",
        "0x4e6ec247": "Insufficient USDT balance.",
        "0x4b5d2d5b": "Sale is not active.",
        "0x4b5d2d5c": "You have already purchased.",
        "0x4b5d2d5d": "You are not registered in CBP.",
        "0x4b5d2d5e": "Purchase amount exceeds cap.",
        "0x4b5d2d5f": "No room for purchase.",
        "0x4b5d2d60": "Referrer is not registered in CBP. This is a known issue with the smart contract.",
      };
      
      if (errorMap[errorData]) {
        return errorMap[errorData];
      }
    }
    
    // Check for specific error messages
    if (error?.message) {
      if (error.message.includes("ReferrerNotRegistered")) {
        return "Referrer is not registered in CBP. This is a known issue with the smart contract.";
      }
      if (error.message.includes("referrer not registered")) {
        return "Referrer is not registered in CBP. This is a known issue with the smart contract.";
      }
      if (error.message.includes("execution reverted")) {
        return "Transaction failed due to smart contract validation. Please try again.";
      }
    }
    
    return error?.message || "Transaction failed.";
  };

  // Simple approval function using direct contract calls
  const approveUSDT = async (amount) => {
    if (!walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }

    console.log("🚀 Approving USDT:", amount.toString());
    
    const hash = await walletClient.writeContract({
      address: USDT_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SALE_ADDRESS, amount],
    });

    console.log("✅ Approval transaction submitted:", hash);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Approval confirmed:", receipt.transactionHash);
    
    return receipt;
  };

  // Simple buy function using direct contract calls
  const buyTokens = async (referrer) => {
    if (!walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }

    if (!userData?.telegram_id) {
      throw new Error("Invalid user data: Telegram ID is required");
    }

    console.log("🚀 Buying tokens with referrer:", referrer);
    
    const hash = await walletClient.writeContract({
      address: SALE_ADDRESS,
      abi: SALE_ABI,
      functionName: "buy",
      args: [BigInt(userData.telegram_id.toString()), referrer], // eslint-disable-line no-undef
    });

    console.log("✅ Buy transaction submitted:", hash);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Buy confirmed:", receipt.transactionHash);
    
    return hash;
  };
  // ---- SIMPLIFIED BUY FUNCTION (Registration handled internally by contract) ----
  const onApproveAndBuy = async () => {    
    // Prevent multiple simultaneous executions
    if (isProcessingBoth || transactionState === 'approving' || transactionState === 'buying') {
      console.log("🔍 Already processing, skipping...");
      showToast("Already processing, skipping...");
      return;
    }
    
    setIsProcessingBoth(true);
    resetTransactionState();
    
    try {
      // Basic validations
      if (!(await ensureBsc())) {
        setIsProcessingBoth(false);
        showToast("Please switch to BSC in the wallet modal.");
        return;
      }
      if (!termsAccepted) {
        showToast("Please accept the terms to continue.");
        setIsProcessingBoth(false);
        return;
      }
      if (already === true) {
        showToast("You have already purchased");
        setIsProcessingBoth(false);
        return;
      }
      
      // If we can't read the already status, warn the user but continue
      if (alreadyError) {
        console.warn("⚠️ Could not check if user has already purchased:", alreadyError.message);
        showToast("Warning: Could not verify purchase status. Proceeding anyway...");
      }
      if (!USDT_ADDRESS || !SALE_ADDRESS || !capUnits || !effectiveCbp || effectiveCbp === ZERO) {
        showToast("Configuration error. Please refresh and try again");
        setIsProcessingBoth(false);
        return;
      }

      if (!balanceOk) {
        console.log("Insufficient USDT balance");
        showToast("Insufficient USDT balance");
        setIsProcessingBoth(false);
        return;
      }

      showToast("Starting purchase...");

      // STEP 1: Simple USDT approval check and execution
      const currentAllowance = allowanceSale || 0n;
      const needsApproval = currentAllowance < capUnits;
      
      console.log("🔍 Approval check:", {
        currentAllowance: currentAllowance.toString(),
        capUnits: capUnits.toString(),
        needsApproval
      });
      
      if (needsApproval) {
        setTransactionState('approving');
        showToast("Approving USDT...");
        
        try {
          const approveReceipt = await approveUSDT(capUnits);
          setLastApproveHash(approveReceipt.transactionHash);
          setHasApproved(true);
          setTransactionState('approved');
          showToast("USDT approved successfully!");
        } catch (approveError) {
          console.error("❌ Approval failed:", approveError);
          throw new Error(`Approval failed: ${approveError.message}`);
        }
      } else {
        console.log("✅ USDT already approved, skipping approval step");
        setTransactionState('approved');
        setHasApproved(true);
        showToast("USDT already approved");
      }

      // STEP 2: Get buy transaction from backend
      if (!BACKEND_URL) {
        showToast("Backend configuration missing");
        setIsProcessingBoth(false);
        return;
      }

      showToast("Preparing purchase...");
      
      const intentRes = await fetch(`${BACKEND_URL}/api/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, telegram_id: userData.telegram_id }),
      });
      
      const intent = await intentRes.json();
      
      if (!intentRes.ok || !intent.ok) {
        console.error("❌ Backend buy request failed:", {
          status: intentRes.status,
          statusText: intentRes.statusText,
          error: intent.error,
          fullResponse: intent
        });
        showToast(intent.error || "Purchase preparation failed");
        setIsProcessingBoth(false);
        return;
      }
      
      // Set the backend cap for use in approval
      if (intent.purchase?.capUSDT) {
        console.log("🔍 Setting backend cap:", intent.purchase.capUSDT);
        setBackendCapUnits(intent.purchase.capUSDT);
      }

      // STEP 3: Simple buy transaction execution
      setTransactionState('buying');
      showToast("Confirm purchase in wallet...");
      
      // Get referrer from backend response
      const referrer = intent.purchase?.referrer || "0x0000000000000000000000000000000000000000";
      console.log("🔍 Using referrer from backend:", referrer);
      
      try {
        const hash = await buyTokens(referrer);
        setBuyTxHash(hash.toString());
        showToast("Transaction confirmed! Verifying purchase...");

        // Confirm with backend
        const confRes = await fetch(`${BACKEND_URL}/api/buy-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, txHash: hash.toString() }),
        });
        const conf = await confRes.json();
        
        if (!confRes.ok || !conf.ok) {
          console.warn("Backend verification failed, but transaction was successful");
          showToast("Purchase completed! (Backend verification pending)");
        } else {
          console.log("✅ Backend verification successful");
          showToast("Purchase verified and completed!");
        }
      } catch (buyError) {
        console.error("❌ Buy transaction failed:", buyError);
        throw new Error(`Buy transaction failed: ${buyError.message}`);
      }
      
      

      setTransactionState('purchased');
      setHasPurchased(true);
      
      // Refresh balances
      try { await refetchAllowanceSale?.(); } catch {}
      try { await refetchUsdtBal?.(); } catch {}
      
    } catch (err) {
      console.error("❌ Transaction failed:", err);
      
      // Decode custom errors if available
      const errorMessage = decodeCustomError(err) || err.message || "Transaction failed";
      
      console.error("❌ Error details:", {
        message: errorMessage,
        originalError: err,
        transactionState,
        isProcessingBoth
      });
      
      showToast(`Transaction failed: ${errorMessage}`);
      setTransactionState('idle');
      setIsProcessingBoth(false);
    } finally {
      if (isProcessingBoth) {
        setIsProcessingBoth(false);
      }
      setTimeout(() => {
        setTransactionState('idle');
      }, 2000);
    }
  };


  /* ===== effects ===== */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Registration effect removed - handled in main flow

  // USDT approval effect removed - handled in main flow

  // Purchase completion effect removed - handled in main flow

  // Approval effect removed - handled in main flow

  // Set hasApproved when allowance is sufficient
  useEffect(() => {
    if (allowanceSale !== undefined && capUnits !== null) {
      if (allowanceSale >= capUnits) {
        setHasApproved(true);
      } else {
        setHasApproved(false);
      }
    }
  }, [allowanceSale, capUnits]);

  // Monitor wagmi hook errors
  useEffect(() => {
    if (usdtApproveError) {
      console.error("❌ USDT Approve Error:", usdtApproveError);
      showToast(`USDT Approval Error: ${decodeCustomError(usdtApproveError)}`);
    }
  }, [usdtApproveError]);

  useEffect(() => {
    if (usdtApproveReceiptError) {
      console.error("❌ USDT Approve Receipt Error:", usdtApproveReceiptError);
      showToast(`USDT Approval Receipt Error: ${decodeCustomError(usdtApproveReceiptError)}`);
    }
  }, [usdtApproveReceiptError]);

  useEffect(() => {
    if (buyError) {
      console.error("❌ Buy Error:", buyError);
      showToast(`Buy Error: ${decodeCustomError(buyError)}`);
    }
  }, [buyError]);

  useEffect(() => {
    if (buyReceiptError) {
      console.error("❌ Buy Receipt Error:", buyReceiptError);
      showToast(`Buy Receipt Error: ${decodeCustomError(buyReceiptError)}`);
    }
  }, [buyReceiptError]);

  // useEffect for 'bought' state removed - using backend integration instead

  // Handle navigation state from terms pages
  useEffect(() => {
    if (location.state) {
      if (location.state.termsAccepted !== undefined) {
        setTermsAccepted(location.state.termsAccepted);
      }
    }
  }, [location.state]);

  /* ===== UI ===== */
  return (
    <div>
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>
              Buy <span className="iex-text">iEX</span>
            </h1>
            <h2>
              The Intelligent <span className="currency-highlight">Currency</span>
            </h2>
            <p className="hero-subtitle">
              Native token of the EonX AI Multi Agent Blockchain
            </p>
          </div>
          <div className="hero-image">
            <img src="/avatar_buy.svg" alt="iEX hero" />
          </div>

          <button 
              onClick={() => navigate('/tokenomics')} 
              className="tokenomics-link"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'inherit', 
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                color: '#fff'
              }}
            >
              iEX Tokenomics
            </button>
          
        </div>
        
      </div>
      

      <div className="buy-page">
        {/* Buy Type Selection */}
        {isBulkBuyAvailable && (
          <div className="buy-type-selection">
            <div className="buy-type-options">
              <label className={`buy-type-option ${buyType === 'single' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="buyType"
                  value="single"
                  checked={buyType === 'single'}
                  onChange={(e) => setBuyType(e.target.value)}
                />
                <div className="buy-type-content">
                  <div className="buy-type-title">Single Buy</div>
                  <div className="buy-type-desc">Buy iEX tokens directly</div>
                </div>
              </label>
              <label className={`buy-type-option ${buyType === 'bulk' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="buyType"
                  value="bulk"
                  checked={buyType === 'bulk'}
                  onChange={(e) => {
                    setBuyType(e.target.value);
                    navigate('/bulk-buy');
                  }}
                />
                <div className="buy-type-content">
                  <div className="buy-type-title">Code Node</div>
                  <div className="buy-type-desc">Create 10 accounts (1 main + 9 sub accounts)</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Wallet Info Bar */}
        <div className="wallet-info-bar">
          <div className="wallet-address-group">
            <div className="wallet-icon">
              <img src="/wallet.svg" alt="Wallet" />
            </div>
            <span className="wallet-address">
              {isConnected ? `${address?.slice(0,6)}...${address?.slice(-4)}` : "Not connected"}
            </span>
          </div>

          <span className="wallet-balance">
            {isConnected
              ? nativeLoading
                ? "Loading..."
                : `${fmtNative3(nativeBal?.formatted)} ${nativeLabel}`
              : `— ${nativeLabel}`}
          </span>

          <span className="token-balance">
            {isConnected && USDT_ADDRESS
              ? usdtLoading
                ? "Loading..."
                : `${fmtUsdtInt(usdtBal?.formatted)} ${usdtSymbol || "USDT"}`
              : `— ${usdtSymbol || "USDT"}`}
          </span>
        </div>

        {/* Currency Description */}
        <div className="currency-description">
          <p>
            The intelligent currency backed by the largest crypto community.
            Governed by people, Powered by AI.
          </p>
        </div>

        {/* Main Purchase Section */}
        <div className="main-purchase-section">
          <div className="limit-content">
            <div className="limit-left">
              <img src="/stake.svg" alt="Coins" />
              <div className="limit-text">
                <span className="limit-label">Current Purchase Cap</span>
                <span className="limit-value">
                  {capUSDT ? `${capUSDT} ${usdtSymbol || "USDT"} (per contract rules)` : "…"}
                </span>
              </div>
            </div>
          </div>

          <div className="amount-row">
            <div className="amount-left">
              <div className="amount-icon">
                <img src="/arrow_right.svg" alt="Arrow" />
              </div>
              <div className="amount-value" style={{ border: "none" }}>
                You will pay <b>{capUSDT ?? "…"} {usdtSymbol || "USDT"}</b>
              </div>
            </div>
            <div className="amount-right">
              <div className="currency-dropdown-container" ref={dropdownRef}>
                <div
                  className="currency-dropdown"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <img src="/usdt.svg" alt="USDT" className="currency-icon" />
                  <span className="currency-text">USDT</span>
                  <img
                    src="/arrow_down.svg"
                    alt="Open dropdown"
                    className={`dropdown-arrow ${isDropdownOpen ? "rotated" : ""}`}
                  />
                </div>

                {isDropdownOpen && (
                  <div className="currency-dropdown-menu">
                    <div className="currency-option">
                      <img src="/usdt.svg" alt="USDT" className="currency-icon" />
                      <span>USDT</span>
                    </div>
                    <div
                      className="currency-option"
                      style={{ opacity: 0.4, cursor: "not-allowed" }}
                    >
                      <img src="/bnb.svg" alt="BNB" className="currency-icon" />
                      <span>BNB (disabled)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="terms-row">
            <div className="checkbox-container">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms" onClick={() => navigate('/terms', { 
                state: { 
                  termsAccepted: termsAccepted
                } 
              })} style={{ cursor: 'pointer' }}>
                Terms & conditions to buy iEX
              </label>
            </div>
            
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {!isConnected ? (
            <button
              className="connect-wallet-btn"
              onClick={() => open({ view: "Connect", namespace: "eip155" })}
            >
              CONNECT WALLET
            </button>
          ) : (
            <button className="connect-wallet-btn" onClick={() => disconnect()}>
              DISCONNECT WALLET
            </button>
          )}


          {!effectiveCbp || effectiveCbp === ZERO ? (
            <div style={{ marginTop: 8, color: "#ffb4b4" }}>
              CBP contract not found. Please check configuration.
            </div>
          ) : null}
          {saleActive === false && (
            <div style={{ marginTop: 8, color: "#ffb4b4" }}>
              Sale is not active yet.
            </div>
          )}
          {already === true && (
            <div style={{ marginTop: 8, color: "#ffb4b4" }}>
              You have already purchased.
            </div>
          )}

          {/* Progress Checkboxes - Only show during process, hide when complete */}
          {isConnected && !(hasPurchased || already === true) && (
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: (allowSaleOk || hasApproved || transactionState === 'approved' || transactionState === 'buying' || transactionState === 'purchased') ? "#4ade80" : "#9ca3af" }}>
                  <input 
                    type="checkbox" 
                    checked={allowSaleOk || hasApproved || transactionState === 'approved' || transactionState === 'buying' || transactionState === 'purchased'} 
                    readOnly 
                    style={{ accentColor: "#4ade80" }}
                  />
                  <span>Approve USDT {(allowSaleOk || hasApproved || transactionState === 'approved' || transactionState === 'buying' || transactionState === 'purchased') ? "✅" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: (hasPurchased || already === true || transactionState === 'purchased') ? "#4ade80" : "#9ca3af" }}>
                  <input 
                    type="checkbox" 
                    checked={hasPurchased || already === true || transactionState === 'purchased'} 
                    readOnly 
                    style={{ accentColor: "#4ade80" }}
                  />
                  <span>Buy iEX (Auto-register) {(hasPurchased || already === true || transactionState === 'purchased') ? "✅" : ""}</span>
                </div>
              </div>
            </div>
          )}

          {isConnected && (
            <div style={{ marginTop: 10 }}>
              {/* Debug info */}
              
              
              <button
                className="connect-wallet-btn"
                onClick={() => {
                  onApproveAndBuy();
                }}
                disabled={
                  !isConnected ||
                  isProcessingBoth ||
                  registering || registerMining ||
                  approving || approveMining ||
                  usdtApproving || usdtApproveMining ||
                  buying || buyMining ||
                  transactionState === 'registering' ||
                  transactionState === 'approving' ||
                  transactionState === 'approved' ||
                  transactionState === 'buying' ||
                  !USDT_ADDRESS || !SALE_ADDRESS ||
                  usdtDecimals == null || !capUnits ||
                  !effectiveCbp || effectiveCbp === ZERO ||
                  (already === true) ||
                  (hasPurchased === true) ||
                  (alreadyLoading && !alreadyError)
                }
              >
                {transactionState === 'approving' ? "Approving USDT..." :
                 transactionState === 'approved' ? "USDT Approved" :
                 transactionState === 'buying' ? "Buying iEX..." :
                 transactionState === 'purchased' ? "Purchase Complete!" :
                 (hasPurchased || already === true) ? "Purchase Complete!" :
                 "Buy iEX Now"}
              </button>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12 }}>
            {(approveHash || lastApproveHash) && (
              <div>
                Approval tx:&nbsp;
                <a
                  href={`https://bscscan.com/tx/${approveHash || lastApproveHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "white", textDecoration: "underline" }}
                >
                  {(approveHash || lastApproveHash).slice(0, 10)}…
                  {(approveHash || lastApproveHash).slice(-8)}
                </a>
              </div>
            )}
            {buyTxHash && (
              <div>
                Buy tx:&nbsp;
                <a
                  href={`https://bscscan.com/tx/${buyTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "white", textDecoration: "underline" }}
                >
                  {buyTxHash.slice(0, 10)}…{buyTxHash.slice(-8)}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="additional-info">
          <ul>
            <li>
              Accept Terms & Conditions to access the EonX CBP Viral Model & begin
              your crypto influencer journey — one share at a time.
            </li>
            <li>
              Become a Money Manifestor by swapping just 30 min of your social
              media time with EonX Infotainment time.
            </li>
          </ul>
        </div>
      </div>

      <div className="bottom-section">
        <img src="/avatar-image-bottom.png" alt="EonX footer art" className="center-image" />
      </div>

      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
    </div>
  );
}