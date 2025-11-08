// /* global BigInt */
// import React, { useEffect, useMemo, useState } from "react";
// import "./Withdraw.css";
// import MobileCircularProgress from "../../components/MobileCircularProgress/MobileCircularProgress";
// import { useNavigate } from "react-router-dom";
// import { createClient } from '@supabase/supabase-js';

// import {
//   useAccount,
//   useDisconnect,
//   useChainId,
//   useSwitchChain,
//   useWriteContract,
//   useWaitForTransactionReceipt,
//   useReadContract,
// } from "wagmi";
// import { useAppKit } from "@reown/appkit/react";
// import { bsc } from "wagmi/chains";
// import { ethers } from "ethers";
// import axios from "axios";

// import TreasuryMerkleABI from "../../abi/TreasuryMerkle.json";

// // Supabase configuration
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// /** ================== ENV CONFIG ================== */
// const ENV =
//   typeof process !== "undefined" && process.env
//     ? process.env
//     : typeof import.meta !== "undefined"
//     ? import.meta.env
//     : {};

// const TREASURY_ADDRESS =
//   ENV.REACT_APP_TREASURY ||
//   ENV.REACT_APP_TREASURY_ADDRESS ||
//   ENV.VITE_TREASURY ||
//   ENV.VITE_TREASURY_ADDRESS ||
//   "";

// const BACKEND_URL =
//   ENV.REACT_APP_BACKEND_URL ||
//   ENV.VITE_BACKEND_URL ||
//   "http://localhost:3000";

// const ENV_CHAIN_ID = Number(ENV.REACT_APP_CHAIN_ID || ENV.VITE_CHAIN_ID || 0);

// // Default to BSC (56)
// const TARGET = bsc;
// const TARGET_ID = ENV_CHAIN_ID > 0 ? ENV_CHAIN_ID : TARGET.id;
// const TARGET_NAME = TARGET_ID === 56 ? "BSC" : `Chain ${TARGET_ID}`;

// const n = (x) => (x == null ? "-" : Number(x).toLocaleString());
// const short = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "");

// /** ================== AXIOS API ================== */
// const api = axios.create({
//   baseURL: BACKEND_URL,
//   headers: {
//     "Content-Type": "application/json",
//     "Cache-Control": "no-cache",
//     Pragma: "no-cache",
//   },
//   withCredentials: false,
// });

// /** ========== Merkle helpers (sorted pairs) ========== */
// function leafHash(batchId, user, amount6) {
//   // Use solidityPackedKeccak256 to match backend encoding
//   return ethers.solidityPackedKeccak256(
//     ["uint256", "address", "uint256"],
//     [BigInt(batchId), user, BigInt(amount6)]
//   );
// }
// function verifyProofSortedPairs(leaf, proof, root) {
//   let hash = leaf.toLowerCase();
//   for (const p of proof) {
//     const b = p.toLowerCase();
//     const [x, y] = hash < b ? [hash, b] : [b, hash];
//     hash = ethers.keccak256(ethers.concat([x, y])).toLowerCase();
//   }
//   return hash === root.toLowerCase();
// }
// function pickRoot(batch) {
//   if (!batch) return undefined;
//   if (Array.isArray(batch)) return batch[0];
//   if (typeof batch === "object" && "root" in batch) return batch.root;
//   return undefined;
// }

// export default function Withdraw({ userData }) {
//   const navigate = useNavigate();
//   const [hasBought, setHasBought] = useState(false);
//   const [isCheckingPurchase, setIsCheckingPurchase] = useState(true);

//   // Check if user has bought from cbp_users table
//   useEffect(() => {
//     const checkPurchaseStatus = async () => {
//       if (!userData?.id) {
//         setIsCheckingPurchase(false);
//         return;
//       }

//       try {
//         setIsCheckingPurchase(true);
//         const { data, error } = await supabase
//           .from('cbp_users')
//           .select('has_bought')
//           .eq('telegram_id', userData.telegram_id)
//           .single();

//         if (error && error.code !== 'PGRST116') {
//           console.error('Error checking purchase status:', error);
//           setHasBought(false);
//         } else {
//           setHasBought(data?.has_bought === true);
//         }
//       } catch (error) {
//         console.error('Error checking purchase status:', error);
//         setHasBought(false);
//       } finally {
//         setIsCheckingPurchase(false);
//       }
//     };

//     checkPurchaseStatus();
//   }, [userData?.id]);

//   // Global error handler
//   useEffect(() => {
//     const handleError = (error) => {
//       console.error("🚨 [FRONTEND] Global error:", error);
//     };
    
//     const handleUnhandledRejection = (event) => {
//       console.error("🚨 [FRONTEND] Unhandled promise rejection:", event.reason);
//     };
    
//     window.addEventListener('error', handleError);
//     window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
//     return () => {
//       window.removeEventListener('error', handleError);
//       window.removeEventListener('unhandledrejection', handleUnhandledRejection);
//     };
//   }, []);

//   const { open } = useAppKit();
//   const { address, isConnected } = useAccount();
//   const { disconnect } = useDisconnect();
//   const chainId = useChainId();
//   const { switchChainAsync } = useSwitchChain();

//   const wallet = address?.toLowerCase() || "";
//   const wrongChain = isConnected && chainId !== TARGET_ID;

//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState(null);
//   const [error, setError] = useState("");
//   const [toast, setToast] = useState(null);

//   const [claimInfo, setClaimInfo] = useState(null);
//   const [isClaiming, setIsClaiming] = useState(false);
//   const [justClaimed, setJustClaimed] = useState(false);

//   const {
//     data: txHash,
//     writeContractAsync,
//     reset: resetWrite,
//   } = useWriteContract();
//   const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isTxError, error: txError } =
//     useWaitForTransactionReceipt({ hash: txHash });

//   // Debug transaction states
//   useEffect(() => {
//     console.log("🔄 [FRONTEND] Transaction state changed:", {
//       txHash,
//       isConfirming,
//       isConfirmed,
//       isTxError,
//       txError
//     });
//   }, [txHash, isConfirming, isConfirmed, isTxError, txError]);

//   const { data: batchData } = useReadContract({
//     address: TREASURY_ADDRESS || undefined,
//     abi: TreasuryMerkleABI.abi,
//     functionName: "batches",
//     args: claimInfo ? [BigInt(claimInfo.batchId)] : undefined,
//     chainId: TARGET_ID,
//     query: { enabled: !!claimInfo && !!TREASURY_ADDRESS },
//   });
//   const merkleRoot = useMemo(() => pickRoot(batchData), [batchData]);

//   const ensureTargetChain = async () => {
//     if (!isConnected) return false;
//     if (chainId !== TARGET_ID) {
//       try {
//         await switchChainAsync({ chainId: TARGET_ID });
//       } catch {
//         open({ view: "Networks", namespace: "eip155" });
//         return false;
//       }
//     }
//     return true;
//   };

//   /** ========== API calls ========== */
//   const fetchStatus = async () => {
//     console.log("🔍 [FRONTEND] fetchStatus called with userData:", userData);
//     if (!userData?.id) {
//       console.log("❌ [FRONTEND] No user data, skipping fetchStatus");
//       return;
//     }
    
//     setLoading(true);
//     setError("");
//     try {
//       console.log("📡 [FRONTEND] Fetching status from API...");
//       const { data } = await api.get(`/api/rewards/status`, {
//         params: { referrer_id: userData.telegram_id, _: Date.now() },
//       });
//       console.log("📡 [FRONTEND] Status response:", data);
//       setStatus(data);
//     } catch (e) {
//       console.error("❌ [FRONTEND] fetchStatus error:", e);
//       setError(e?.response?.data?.error || e?.message || "Failed to load status");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Also fetch status when userData is available (even without wallet)
//   useEffect(() => {
//     if (userData?.id) {
//       console.log("🔍 [FRONTEND] userData available, fetching status...");
//       fetchStatus();
//     }
//   }, [userData?.id]);

//   const fetchClaimInfo = async () => {
//     console.log("🔍 [FRONTEND] fetchClaimInfo called with userData:", userData);
//     if (!userData?.id) {
//       console.log("❌ [FRONTEND] No user data, skipping fetchClaimInfo");
//       return;
//     }
    
//     try {
//       console.log("📡 [FRONTEND] Fetching claims from API...");
//       const { data: resp } = await api.get(`/api/rewards/claims`, {
//         params: { referrer_id: userData.telegram_id, _: Date.now() },
//       });
//       console.log("📡 [FRONTEND] API response:", resp);
      
//       const rows = resp?.data || [];
//       console.log("📡 [FRONTEND] Found rows:", rows.length);

//       // Find the most recent eligible claim (not userclaimed and has all required data)
//       const candidate = rows.find(
//         (r) =>
//           r?.batch_id != null &&
//           r?.tx_id &&
//           r?.proof &&
//           r?.isPayoutProcessed === true &&
//           r.userclaimed === false
//       );
      
//       console.log("🔍 [FRONTEND] Candidate found:", !!candidate);
//       console.log("🔍 [FRONTEND] All rows for debugging:", rows.map(r => ({
//         id: r.id,
//         batch_id: r.batch_id,
//         tx_id: r.tx_id,
//         proof: r.proof,
//         userclaimed: r.userclaimed,
//         isPayoutProcessed: r.isPayoutProcessed,
//         amount: r.amount,
//         tier: r.tier
//       })));
      
//       // Check if there are any claimed claims
//       const claimedClaims = rows.filter(r => r.userclaimed === true);
//       console.log("🔍 [FRONTEND] Claimed claims found:", claimedClaims.length);
//       if (claimedClaims.length > 0) {
//         console.log("🔍 [FRONTEND] Claimed claims details:", claimedClaims);
//       }
//       if (candidate) {
//         console.log("🔍 [FRONTEND] Candidate details:", {
//           batch_id: candidate.batch_id,
//           tx_id: candidate.tx_id,
//           proof: candidate.proof,
//           amount: candidate.amount,
//           userclaimed: candidate.userclaimed,
//           isPayoutProcessed: candidate.isPayoutProcessed
//         });
//       }
      
//       if (!candidate) {
//         console.log("❌ [FRONTEND] No eligible candidate found");
//         console.log("🔍 [FRONTEND] Available claims:", rows.length);
//         console.log("🔍 [FRONTEND] Claimed claims:", claimedClaims.length);
//         console.log("🔍 [FRONTEND] Unclaimed claims:", rows.filter(r => r.userclaimed === false).length);
        
//         // If all claims are claimed, show the most recent one for display purposes
//         if (claimedClaims.length > 0) {
//           const mostRecentClaim = claimedClaims[0]; // Already sorted by created_at desc
//           console.log("🔍 [FRONTEND] Showing most recent claimed claim for display:", mostRecentClaim);
          
//           const amount6 = (BigInt(mostRecentClaim.amount ?? 0) * 1000000000000000000n).toString();
//           let proof = [];
//           try {
//             const p = JSON.parse(mostRecentClaim.proof);
//             if (Array.isArray(p)) proof = p;
//           } catch (e) {
//             console.error("❌ [FRONTEND] Error parsing proof:", e);
//           }

//           const claimData = {
//             batchId: Number(mostRecentClaim.batch_id),
//             amount6,
//             proof,
//             tx_id: mostRecentClaim.tx_id,
//             claim_txid: mostRecentClaim.claim_txid,
//             raw: mostRecentClaim,
//             isClaimed: true, // Mark as claimed for display purposes
//           };
          
//           setClaimInfo(claimData);
//           setError(""); // Clear any previous errors
//           return;
//         }
        
//         setClaimInfo(null);
//         setError("No eligible claims found. You may have already claimed all available rewards or no claims have been processed yet.");
//         return;
//       }

//       // DB `amount` = integer USD → scale to 6-decimals
//       const amount6 = (BigInt(candidate.amount ?? 0) * 1000000000000000000n).toString();
//       let proof = [];
//       try {
//         const p = JSON.parse(candidate.proof);
//         if (Array.isArray(p)) proof = p;
//         console.log("🔍 [FRONTEND] Parsed proof:", proof);
//       } catch (e) {
//         console.error("❌ [FRONTEND] Error parsing proof:", e);
//       }

//       const claimData = {
//         batchId: Number(candidate.batch_id),
//         amount6,
//         proof,
//         tx_id: candidate.tx_id,
//         raw: candidate,
//       };
      
//       console.log("✅ [FRONTEND] Setting claimInfo:", claimData);
//       setClaimInfo(claimData);
//     } catch (e) {
//       console.error("❌ [FRONTEND] fetchClaimInfo error", e);
//     }
//   };

//   // === THE ONLY PLACE WE TOUCH FOR THE UPDATE API PAYLOAD ===
//   const notifyServerClaim = async () => {
//     console.log("🔄 [FRONTEND] ===== CALLING notifyServerClaim() TO UPDATE DATABASE =====");
    
//     // Validate required data before making the request
//     if (!userData?.id) {
//       console.error("❌ [FRONTEND] userData.id is missing");
//       setError("User data not available. Please refresh the page.");
//       return;
//     }
    
//     if (!claimInfo) {
//       console.error("❌ [FRONTEND] claimInfo is null - no claim data available");
//       setError("No claim data available. Please check if you have any pending claims.");
//       return;
//     }
    
//     if (!claimInfo.batchId || !claimInfo.amount6) {
//       console.error("❌ [FRONTEND] claimInfo missing required fields:", {
//         batchId: claimInfo.batchId,
//         amount6: claimInfo.amount6
//       });
//       setError("Invalid claim data. Please refresh the page.");
//       return;
//     }
    
//     // Get the transaction hash from the confirmed transaction
//     if (!txHash) {
//       console.error("❌ [FRONTEND] txHash is missing - no transaction hash available");
//       setError("Transaction hash not available. Please refresh the page.");
//       return;
//     }
    
//     console.log("📡 [FRONTEND] Notifying server of successful claim...");
//     const payload = {
//       referrer_id: String(userData.id),        // EXACTLY what backend expects
//       batch_id: Number(claimInfo.batchId),     // EXACTLY what backend expects
//       amount6: String(claimInfo.amount6),      // EXACTLY what backend expects
//       claim_txid: String(txHash),              // NEW: Individual claim transaction hash
//     };

//     console.log("📡 [FRONTEND] Sending to:", `${BACKEND_URL}/api/rewards/claim/update`);
//     console.log("📡 [FRONTEND] Payload:", payload);
//     console.log("📡 [FRONTEND] Axios baseURL:", api.defaults.baseURL);

//     try {
//       const { data } = await api.post(`/api/rewards/claim/update`, payload);
//       console.log("📡 [FRONTEND] Server response:", data);
//       if (!data.ok) {
//         console.error("❌ [FRONTEND] Server rejected claim update:", data);
//         setError(data.reason || data.error || "Claim recorded, but server rejected update.");
//       } else {
//         console.log("✅ [FRONTEND] Server confirmed claim update");
//         setToast(`Claimed Tier ${data.claimedTier} for $${n(data.rewardUSD)}.`);
//       }
//     } catch (e) {
//       console.error("❌ [FRONTEND] Server notification failed:", e);
//       console.error("❌ [FRONTEND] Error details:", {
//         message: e?.message,
//         response: e?.response?.data,
//         status: e?.response?.status,
//         statusText: e?.response?.statusText,
//         config: e?.config,
//         code: e?.code,
//         name: e?.name
//       });
//       setError(e?.response?.data?.error || e?.response?.data?.details || e?.message || "Claim succeeded on-chain, but server update failed");
//     }
//   };

//   /** ========== Claim flow ========== */
//   const handleClaim = async () => {
//     console.log("🚀 [FRONTEND] handleClaim called!");
//     console.log("🚀 [FRONTEND] wallet:", wallet);
//     console.log("🚀 [FRONTEND] claimInfo:", claimInfo);
//     console.log("🚀 [FRONTEND] TREASURY_ADDRESS:", TREASURY_ADDRESS);
    
//     if (!wallet || !claimInfo) {
//       console.log("❌ [FRONTEND] Missing wallet or claimInfo");
//       console.log("❌ [FRONTEND] wallet exists:", !!wallet);
//       console.log("❌ [FRONTEND] claimInfo exists:", !!claimInfo);
//       return;
//     }
    
//     if (!TREASURY_ADDRESS) {
//       console.log("❌ [FRONTEND] No treasury address configured");
//       setError("Treasury address is not configured.");
//       return;
//     }
    
//     console.log("🔗 [FRONTEND] Checking target chain...");
//     const ok = await ensureTargetChain();
//     if (!ok) {
//       console.log("❌ [FRONTEND] Failed to switch to target chain");
//       return;
//     }
//     console.log("✅ [FRONTEND] Target chain confirmed");

//     try {
//       console.log("🧹 [FRONTEND] Clearing previous errors and toasts");
//       setError("");
//       setToast(null);
//       resetWrite?.();

//       console.log("🔍 [FRONTEND] Checking merkle root...");
//       if (!merkleRoot) {
//         console.log("❌ [FRONTEND] No merkle root found");
//         throw new Error("Batch not found on-chain. Please try again later.");
//       }
//       console.log("✅ [FRONTEND] Merkle root found:", merkleRoot);

//       // Debug logging
//       console.log("🔍 [FRONTEND] Claim Debug Info:");
//       console.log("🔍 [FRONTEND] Batch ID:", claimInfo.batchId);
//       console.log("🔍 [FRONTEND] Wallet:", wallet);
//       console.log("🔍 [FRONTEND] Amount6:", claimInfo.amount6);
//       console.log("🔍 [FRONTEND] Merkle Root:", merkleRoot);
//       console.log("🔍 [FRONTEND] Proof:", claimInfo.proof);
//       console.log("🔍 [FRONTEND] Proof Length:", claimInfo.proof.length);
      
//       // Verify proof locally first (optional - smart contract will also verify)
//       console.log("🔍 [FRONTEND] Verifying proof locally...");
//       const leaf = leafHash(claimInfo.batchId, wallet, claimInfo.amount6);
//       const proofValid = verifyProofSortedPairs(leaf, claimInfo.proof, merkleRoot);
//       console.log("🔍 [FRONTEND] Local proof verification:", proofValid ? "✅ VALID" : "❌ INVALID");
//       console.log("🔍 [FRONTEND] Leaf:", leaf);
//       console.log("🔍 [FRONTEND] Proof:", claimInfo.proof);
//       console.log("🔍 [FRONTEND] Root:", merkleRoot);

//       console.log("📝 [FRONTEND] Preparing transaction...");
//       console.log("📝 [FRONTEND] Contract address:", TREASURY_ADDRESS);
//       console.log("📝 [FRONTEND] Function: claim");
//       console.log("📝 [FRONTEND] Args:", [BigInt(claimInfo.batchId), BigInt(claimInfo.amount6), claimInfo.proof]);
//       console.log("📝 [FRONTEND] Chain ID:", TARGET_ID);

//       // Set claiming state
//       console.log("🔄 [FRONTEND] Setting claiming state...");
//       setIsClaiming(true);

//       // 1. Send tx
//       console.log("🚀 [FRONTEND] Calling writeContractAsync...");
//       const hash = await writeContractAsync({
//         address: TREASURY_ADDRESS,
//         abi: TreasuryMerkleABI.abi,
//         functionName: "claim",
//         args: [BigInt(claimInfo.batchId), BigInt(claimInfo.amount6), claimInfo.proof],
//         chainId: TARGET_ID,
//       });
//       console.log("✅ [FRONTEND] Claim tx submitted:", hash);

//       // 2. Transaction submitted - the useWaitForTransactionReceipt hook will handle confirmation
//       console.log("⏳ [FRONTEND] Transaction submitted, waiting for confirmation...");
//     } catch (e) {
//       console.error("❌ [FRONTEND] Claim error:", e);
//       console.error("❌ [FRONTEND] Error details:", {
//         message: e?.message,
//         data: e?.data,
//         errorName: e?.data?.errorName,
//         shortMessage: e?.cause?.shortMessage
//       });
      
//       // Reset claiming state on error
//       setIsClaiming(false);
      
//       if (e?.data?.errorName) {
//         setError(`Revert: ${e.data.errorName}`);
//       } else if (e?.message) {
//         setError(e.message);
//       } else {
//         setError("Claim transaction failed");
//       }
//     }
//   };

//   useEffect(() => {
//     if (isConfirmed && wallet) {
//       console.log("✅ [FRONTEND] Transaction confirmed, notifying server...");
//       (async () => {
//         // Reset claiming state
//         setIsClaiming(false);
        
//         // Notify server and refresh data
//         console.log("🔄 [FRONTEND] Transaction confirmed! Now calling notifyServerClaim() to update database...");
        
//         // Only call notifyServerClaim if we have valid data
//         if (userData?.id && claimInfo?.batchId && claimInfo?.amount6) {
//           await notifyServerClaim();
//         } else {
//           console.error("❌ [FRONTEND] Cannot notify server - missing required data:", {
//             hasUserData: !!userData?.id,
//             hasClaimInfo: !!claimInfo,
//             hasBatchId: !!claimInfo?.batchId,
//             hasAmount6: !!claimInfo?.amount6
//           });
//           setError("Transaction successful but cannot update database - missing claim data. Please refresh the page.");
//         }
        
//         // Small delay to ensure database updates are processed
//         await new Promise(resolve => setTimeout(resolve, 1000));
        
//         // Refresh all data
//         console.log("🔄 [FRONTEND] Refreshing status and claim info...");
//         await fetchStatus();
//         await fetchClaimInfo();
        
//         // Clear any errors and show success
//         setError(null);
//         setJustClaimed(true);
//         console.log("✅ [FRONTEND] Claim process completed successfully");
//         console.log("✅ [FRONTEND] Current claimInfo after refresh:", claimInfo);
        
//         // Reset justClaimed after 5 seconds
//         setTimeout(() => setJustClaimed(false), 5000);
//       })();
//     }
//   }, [isConfirmed]);

//   useEffect(() => {
//     if (isTxError && txError) {
//       console.error("Transaction failed:", txError);
      
//       // Reset claiming state on transaction error
//       setIsClaiming(false);
  
//       if (txError.cause?.data?.errorName) {
//         setError(`Revert: ${txError.cause.data.errorName}`);
//       } else if (txError.cause?.shortMessage) {
//         setError(txError.cause.shortMessage);
//       } else {
//         setError(txError.message || "Transaction failed");
//       }
//     }
//   }, [isTxError, txError]);
  

//   useEffect(() => {
//     if (wallet && userData?.id) {
//       fetchStatus();
//       fetchClaimInfo();
//     } else if (!wallet) {
//       setStatus(null);
//       setClaimInfo(null);
//     }
//   }, [wallet, userData?.id]);

//   /** ============== Derived UI ============== */
//   const progressPct = useMemo(() => {
//     if (!status?.ok || !status?.nextTier) return 0;
//     const cur = Number(status.nextTier.currentGvm ?? 0);
//     const tgt = Number(status.nextTier.targetGvm ?? 1);
//     if (!tgt || !isFinite(tgt)) return 0;
//     return Math.min(100, Math.floor((cur / tgt) * 100));
//   }, [status]);

//   const todo = status?.todo || [];
//   const eligible = !!status?.eligible;
//   const currentTier = status?.currentTier ?? 0;
//   const isCurrentTier = status?.isCurrentTier || false;
//   const nextTier = status?.nextTier?.tierNo ?? "-";
//   const reward = status?.nextTier?.rewardUSD ?? 0;

//   const hasClaim = !!claimInfo;
//   const isClaimed = claimInfo?.isClaimed || false;
//   // Use current tier's reward amount for display, but keep claim record amount for smart contract
//   const claimAmountUsd = hasClaim ? (status?.nextTier?.rewardUSD ?? 0) : 0;
//   const claimAmountUsdFromRecord = hasClaim && claimInfo?.amount6 ? Number(BigInt(claimInfo.amount6) / 1000000n) : 0;
  
//   // Debug: Show both amounts
//   if (hasClaim) {
//     console.log(`🔍 [FRONTEND] Reward amounts - Current tier: $${claimAmountUsd}, Claim record: $${claimAmountUsdFromRecord}`);
//   }

//   const buttonBusy = loading || isConfirming || isClaiming;

//   // Fix: Don't disable button for valid claims (proof exists and is array)
//   const buttonDisabled = buttonBusy || !wallet || wrongChain || !TREASURY_ADDRESS || !userData?.id || !claimInfo || (hasClaim && claimInfo && (!claimInfo?.proof || !Array.isArray(claimInfo.proof)));
  
//   console.log("🔍 [FRONTEND] Button state debug:", {
//     buttonBusy,
//     loading,
//     isConfirming,
//     isClaiming,
//     wallet: !!wallet,
//     wrongChain,
//     TREASURY_ADDRESS: !!TREASURY_ADDRESS,
//     hasUserData: !!userData?.id,
//     hasClaim,
//     claimInfo: !!claimInfo,
//     proof: claimInfo?.proof,
//     proofLength: claimInfo?.proof?.length,
//     buttonDisabled,
//     isConnected,
//     chainId,
//     TARGET_ID
//   });

//   return (
//     <div>
//       <div className="withdraw-page">
//         {/* ===== Wallet header ===== */}
//         <div className="withdraw-section" style={{ marginTop: 0 }}>
//           <div className="section-header">
//             {/* <div className="header-left">
//               <div className="section-icon">
//                 <img src="/wallet.svg" alt="Wallet" />
//               </div>
//               <span>
//                 {isConnected ? (
//                   <>Connected: <span className="withdraw-highlight">{short(address)}</span></>
//                 ) : (
//                   <>Connect your <span className="withdraw-highlight">wallet</span></>
//                 )}
//               </span>
//             </div> */}
//             <div className="header-right">
//               {isConnected && (
//                 <span className="amount">
//                   {wrongChain ? `Wrong network` : `Chain 0x${(chainId ?? 0).toString(16)}`}
//                 </span>
//               )}
//             </div>
//           </div>

//           {isConnected && (
//             <div style={{ display: "flex", gap: 12 }}>
//               {wrongChain && (
//                 <button className="claim-button" onClick={ensureTargetChain}>
//                   Switch to {TARGET_NAME}
//                 </button>
//               )}
//               <button className="claim-button" onClick={() => disconnect()}>
//                 Disconnect
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Show different content based on wallet connection and purchase status */}
//         {!isConnected ? (
//           <div className="withdraw-section">
//             <div style={{ padding: "40px 20px", textAlign: "center" }}>
//               <div style={{ 
//                 marginBottom: "30px",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "12px"
//               }}>
//                 <div className="section-icon">
//                   <img src="/wallet.svg" alt="Wallet" />
//                 </div>
//                 <span style={{ 
//                   whiteSpace: "nowrap",
//                   fontSize: "18px",
//                   fontWeight: "500"
//                 }}>
//                   Connect wallet to see your <span className="withdraw-highlight">stats</span>
//                 </span>
//               </div>
//               <button
//                 className="claim-button"
//                 onClick={() => open({ view: "Connect", namespace: "eip155" })}
//                 style={{ 
//                   fontSize: "14px", 
//                   padding: "12px 24px",
//                   fontWeight: "bold",
//                   letterSpacing: "0.3px",
//                   minWidth: "200px"
//                 }}
//               >
//                 CONNECT WALLET
//               </button>
//             </div>
//           </div>
//         ) : !hasBought ? (
//           <div className="withdraw-section">
//             <div className="section-header">
//               <div className="header-left">
//                 <div className="section-icon">
//                   <img src="/coins_icon.svg" alt="Buy" />
//                 </div>
//                 <span style={{ whiteSpace: "nowrap" }}>Buy EonX to start your <span className="withdraw-highlight">earnings</span></span>
//               </div>
//             </div>
//             <div style={{ padding: "20px", textAlign: "center" }}>
//               <button
//                 className="claim-button"
//                 onClick={() => navigate("/buy")}
//                 style={{ 
//                   fontSize: "14px", 
//                   padding: "12px 24px",
//                   fontWeight: "bold",
//                   letterSpacing: "0.3px",
//                   minWidth: "200px"
//                 }}
//               >
//                 BUY EONX TOKENS
//               </button>
//             </div>
//           </div>
//         ) : (
//           <>
//             {/* Progress */}
//             <div className="circular-progress-wrapper">
//               <MobileCircularProgress userData={userData} />
//             </div>

//             {/* Growth Chart Section */}
//             <div className="withdraw-section">
//               <div className="section-header">
//                 <div className="header-left">
//                   <div className="section-icon">
//                     <img src="/bars.svg" alt="Growth" />
//                   </div>
//                   <span>Growth <span className="withdraw-highlight">Analytics</span></span>
//                 </div>
//               </div>
              
//               <div className="growth-chart-container">
//                 <div className="growth-stats">
//                   <div className="growth-stat">
//                     <div className="stat-label">Current Tier</div>
//                     <div className="stat-value">{currentTier}</div>
//                   </div>
//                   <div className="growth-stat">
//                     <div className="stat-label">Progress</div>
//                     <div className="stat-value">{progressPct}%</div>
//                   </div>
//                   <div className="growth-stat">
//                     <div className="stat-label">Reward Value</div>
//                     <div className="stat-value">${n(reward)}</div>
//                   </div>
//                 </div>
                
//                 <div className="growth-visual">
//                   <div className="progress-bar">
//                     <div 
//                       className="progress-fill" 
//                       style={{ width: `${progressPct}%` }}
//                     ></div>
//                   </div>
//                   <div className="progress-labels">
//                     <span>Tier {currentTier}</span>
//                     <span>Tier {isCurrentTier ? currentTier : nextTier}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </>
//         )}

//         {/* Rewards / Eligibility - Only show if wallet is connected and user has bought */}
//         {isConnected && hasBought && (
//           <div className="withdraw-section">
//             <div className="section-header">
//             <div className="header-left">
//               <div className="section-icon">
//                 <img src="/bars.svg" alt="Chart" />
//               </div>
//               <span>
//                 {isCurrentTier ? (
//                   <>
//                     Current Tier <span className="withdraw-highlight">{currentTier}</span> Requirements
//                   </>
//                 ) : (
//                   <>
//                     Tier <span className="withdraw-highlight">{currentTier}</span> Claimed → Working on Tier{" "}
//                     <span className="withdraw-highlight">{nextTier}</span>
//                   </>
//                 )}
//               </span>
//             </div>
//             <div className="header-right">
//               <span className="amount">${n(reward)}</span>
//             </div>
//           </div>

//           {toast && <p style={{ color: "var(--success)", marginTop: 8 }}>{toast}</p>}
//           {error && <p style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}

//           {/* Show claim card only if user is eligible and has a claim ready */}
//           {eligible && hasClaim && !justClaimed && !isClaimed && (
//             <div className="withdraw-cards" style={{ marginTop: 8 }}>
//               <div className="withdraw-card">
//                 <div className="card-left">Claim</div>
//                 <div className="card-center">
//                   Pending payout: <b>${n(claimAmountUsd)}</b> (batch #{claimInfo?.batchId || 'N/A'})
//                 </div>
//                 <div className="card-right">✅ Ready</div>
//               </div>
//             </div>
//           )}

//           {/* Show claimed status for already claimed claims */}
//           {hasClaim && isClaimed && !justClaimed && (
//             <div className="withdraw-cards" style={{ marginTop: 8 }}>
//               <div className="withdraw-card" style={{ backgroundColor: "var(--success)", color: "white" }}>
//                 <div className="card-left">Claimed</div>
//                 <div className="card-center">
//                   Successfully claimed: <b>${n(claimAmountUsd)}</b> (batch #{claimInfo?.batchId || 'N/A'})
//                   {claimInfo?.claim_txid && (
//                     <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
//                       TX: {short(claimInfo.claim_txid)}
//                     </div>
//                   )}
//                 </div>
//                 <div className="card-right">🎉</div>
//               </div>
//             </div>
//           )}

//           {/* Show claimed status after successful claim */}
//           {justClaimed && (
//             <div className="withdraw-cards" style={{ marginTop: 8 }}>
//               <div className="withdraw-card" style={{ backgroundColor: "var(--success)", color: "white" }}>
//                 <div className="card-left">Claimed</div>
//                 <div className="card-center">
//                   Successfully claimed: <b>${n(claimAmountUsd)}</b> (batch #{claimInfo?.batchId || 'N/A'})
//                   {txHash && (
//                     <div style={{ fontSize: "12px", marginTop: "4px", opacity: 0.8 }}>
//                       TX: {short(txHash)}
//                     </div>
//                   )}
//                 </div>
//                 <div className="card-right">🎉</div>
//               </div>
//             </div>
//           )}

//           {/* Show reward status and requirements when user is not eligible or has no claims */}
//           {status?.ok && (!eligible || !hasClaim) && (
//             <div className="withdraw-cards" style={{ marginTop: 8 }}>
//               {eligible && !hasClaim ? (
//                 <div className="withdraw-card">
//                   <div className="card-left">Status</div>
//                   <div className="card-center">
//                     <b>Eligible for Tier {isCurrentTier ? currentTier : nextTier}!</b> Complete requirements to claim.
//                   </div>
//                   <div className="card-right">🎯</div>
//                 </div>
//               ) : !eligible ? (
//                 todo.length === 0 ? (
//                   <div className="withdraw-card">
//                     <div className="card-left">Status</div>
//                     <div className="card-center">Keep going! You're close to the next tier.</div>
//                     <div className="card-right">—</div>
//                   </div>
//                 ) : (
//                   todo.map((t, i) => (
//                     <div key={i} className="withdraw-card requirement-card">
//                       <div className="card-left">Requirement</div>
//                       <div className="card-center">{t}</div>
//                       <div className="card-right">⏳</div>
//                     </div>
//                   ))
//                 )
//               ) : null}
//             </div>
//           )}

//           {/* Only show claim button if user is eligible and has a claim */}
//           {eligible && hasClaim && !justClaimed && !isClaimed && (
//             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//               <button
//                 className="claim-button"
//                 onClick={() => {
//                   console.log("🔍 [FRONTEND] ===== CLAIM BUTTON CLICKED =====");
//                   console.log("🔍 [FRONTEND] hasClaim:", hasClaim);
//                   console.log("🔍 [FRONTEND] claimInfo:", claimInfo);
//                   console.log("🔍 [FRONTEND] buttonDisabled:", buttonDisabled);
//                   console.log("🔍 [FRONTEND] wallet:", wallet);
//                   console.log("🔍 [FRONTEND] status:", status);
//                   console.log("🔍 [FRONTEND] isConnected:", isConnected);
//                   console.log("🔍 [FRONTEND] chainId:", chainId);
//                   console.log("🔍 [FRONTEND] TARGET_ID:", TARGET_ID);
//                   console.log("🔍 [FRONTEND] TREASURY_ADDRESS:", TREASURY_ADDRESS);
//                   console.log("🔍 [FRONTEND] buttonBusy:", buttonBusy);
//                   console.log("🔍 [FRONTEND] loading:", loading);
//                   console.log("🔍 [FRONTEND] isConfirming:", isConfirming);
//                   console.log("🔍 [FRONTEND] isClaiming:", isClaiming);
                  
//                   if (buttonDisabled) {
//                     console.log("❌ [FRONTEND] Button is disabled, not executing action");
//                     return;
//                   }
                  
//                   console.log("🔍 [FRONTEND] Calling handleClaim...");
//                   handleClaim();
//                   console.log("🔍 [FRONTEND] ===== CLAIM BUTTON CLICK COMPLETE =====");
//                 }}
//                 disabled={buttonDisabled}
//               >
//                 {buttonBusy
//                   ? isClaiming
//                     ? "Claiming..."
//                     : isConfirming
//                     ? "Confirming..."
//                     : "Please wait..."
//                   : `Claim $${n(claimAmountUsd)}`}
//               </button>
//             </div>
//           )}

//           {/* Show success message after claim */}
//           {justClaimed && (
//             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//               <div style={{ 
//                 padding: "16px", 
//                 backgroundColor: "var(--success)", 
//                 color: "white", 
//                 borderRadius: "8px",
//                 textAlign: "center",
//                 fontSize: "16px",
//                 fontWeight: "bold"
//               }}>
//                 🎉 Claim Successful! Tier updated and reward claimed.
//               </div>
//             </div>
//           )}
//           </div>
//         )}
//       </div>

//       <div className="bottom-section">
//         <img src="/avatar-image-bottom.png" alt="Avatar" className="center-image" />
//       </div>
//     </div>
//   );
// }
