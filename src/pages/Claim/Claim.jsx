/* global BigInt */
import React, { useState, useEffect, useMemo } from "react";
import "./Claim.css";
import { 
    useAccount, 
    useWriteContract, 
    useWaitForTransactionReceipt,
    useReadContract,
    useChainId,
    useSwitchChain
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { bsc } from "wagmi/chains";
import { ethers } from "ethers";
import axios from "axios";
import { supabase } from "../../lib/supabaseClient";
import MobileCircularProgress from "../../components/MobileCircularProgress/MobileCircularProgress";
import TreasuryMerkleABI from "../../abi/TreasuryMerkle.json";

/** ================== ENV CONFIG ================== */
const ENV =
  typeof process !== "undefined" && process.env
    ? process.env
    : typeof import.meta !== "undefined"
    ? import.meta.env
    : {};

const TREASURY_ADDRESS =
  ENV.REACT_APP_TREASURY ||
  ENV.REACT_APP_TREASURY_ADDRESS ||
  ENV.VITE_TREASURY ||
  ENV.VITE_TREASURY_ADDRESS ||
  "";

const BACKEND_URL =
  ENV.REACT_APP_BACKEND_URL ||
  ENV.VITE_BACKEND_URL ||
  "http://localhost:3000";

const ENV_CHAIN_ID = Number(ENV.REACT_APP_CHAIN_ID || ENV.VITE_CHAIN_ID || 0);

// Default to BSC (56)
const TARGET = bsc;
const TARGET_ID = ENV_CHAIN_ID > 0 ? ENV_CHAIN_ID : TARGET.id;
const TARGET_NAME = TARGET_ID === 56 ? "BSC" : `Chain ${TARGET_ID}`;


export default function Claim({ userData }) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const { open } = useAppKit();
    
    const [claimsData, setClaimsData] = useState([]);
    const [dbWalletAddress, setDbWalletAddress] = useState(null);
    const [dbId, setDbId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addressMatch, setAddressMatch] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimingClaimId, setClaimingClaimId] = useState(null);
    const [checkingClaimedStatus, setCheckingClaimedStatus] = useState(false);
    const [alreadyClaimedMessage, setAlreadyClaimedMessage] = useState(null);
    
    const wallet = address?.toLowerCase() || "";
    const wrongChain = isConnected && chainId !== TARGET_ID;

    const {
        data: txHash,
        writeContractAsync,
        reset: resetWrite,
    } = useWriteContract();
    
    const { 
        isLoading: isConfirming, 
        isSuccess: isConfirmed, 
        isError: isTxError, 
        error: txError 
    } = useWaitForTransactionReceipt({ hash: txHash });
    
    
    // Function to get wallet address from cbp_users table
    const getWalletAddressFromDB = async (telegramId) => {
        try {
            const { data, error } = await supabase
                .from('cbp_users')
                .select('id, wallet_address')
                .eq('telegram_id', telegramId)
                .single();

            if (error) {
                console.error('Error fetching wallet address:', error);
                return null;
            }
            setDbId(data.id);

            return data?.wallet_address;
        } catch (err) {
            console.error('Error in getWalletAddressFromDB:', err);
            return null;
        }
    };

    // Function to fetch pending claims from cbp_users_claims table
    const fetchPendingClaims = async (walletAddress) => {
        try {
            const { data, error } = await supabase
                .from('cbp_user_claims')
                .select('*')
                .eq('wallet_address', walletAddress)
                .eq('isPayoutProcessed', true)
                .eq('userclaimed', false);

            if (error) {
                console.error('Error fetching claims:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('Error in fetchPendingClaims:', err);
            return [];
        }
    };

    // Function to refresh claims data
    const refreshClaims = async () => {
        if (!dbWalletAddress) {
            console.log('❌ [FRONTEND] No wallet address available for refresh');
            return;
        }

        try {
            console.log('🔄 [FRONTEND] Refreshing claims data...');
            const claims = await fetchPendingClaims(dbWalletAddress);
            setClaimsData(claims);
            console.log('✅ [FRONTEND] Claims data refreshed successfully');
        } catch (err) {
            console.error('Error in refreshClaims:', err);
        }
    };

    // Ensure target chain is connected
    const ensureTargetChain = async () => {
        if (!isConnected) return false;
        if (chainId !== TARGET_ID) {
            try {
                await switchChainAsync({ chainId: TARGET_ID });
            } catch {
                open({ view: "Networks", namespace: "eip155" });
                return false;
            }
        }
        return true;
    };

    // Function to check if claim is already claimed on blockchain
    const checkClaimedStatus = async (claim) => {
        if (!claim || !wallet || !TREASURY_ADDRESS) {
            return false;
        }

        try {
            console.log("🔍 [FRONTEND] Checking claimed status for claim:", claim.id);
            setCheckingClaimedStatus(true);
            setAlreadyClaimedMessage(null);

            // Convert amount to 6 decimals for the check
            const amount6 = (BigInt(claim.amount ?? 0) * 1000000000000000000n).toString();

            // Use readContract to check if already claimed
            const { readContract } = await import('wagmi/actions');
            const isClaimed = await readContract({
                address: TREASURY_ADDRESS,
                abi: TreasuryMerkleABI.abi,
                functionName: "claimed",
                args: [BigInt(claim.batch_id), wallet],
                chainId: TARGET_ID,
            });

            console.log("🔍 [FRONTEND] Claimed status:", isClaimed);

            if (isClaimed) {
                setAlreadyClaimedMessage(`This claim (${claim.amount} USDT) has already been claimed on the blockchain.`);
                // Refresh the table data to update the UI
                await refreshClaims();
                return true;
            }

            return false;
        } catch (error) {
            console.error("❌ [FRONTEND] Error checking claimed status:", error);
            setError("Failed to check claim status. Please try again.");
            return false;
        } finally {
            setCheckingClaimedStatus(false);
        }
    };



    // Handle blockchain claim
    const handleBlockchainClaim = async (claim) => {
        console.log("🚀 [FRONTEND] Starting blockchain claim for:", claim);
        
        if (!wallet || !claim) {
            console.log("❌ [FRONTEND] Missing wallet or claim data");
            return;
        }
        
        if (!TREASURY_ADDRESS) {
            console.log("❌ [FRONTEND] No treasury address configured");
            setError("Treasury address is not configured.");
            return;
        }
        
        console.log("🔗 [FRONTEND] Checking target chain...");
        const ok = await ensureTargetChain();
        if (!ok) {
            console.log("❌ [FRONTEND] Failed to switch to target chain");
            return;
        }
        console.log("✅ [FRONTEND] Target chain confirmed");

        try {
            console.log("🧹 [FRONTEND] Clearing previous errors");
            setError("");
            resetWrite?.();
            setIsClaiming(true);
            setClaimingClaimId(claim.id);

            // Parse proof
            let proof = [];
            try {
                const p = JSON.parse(claim.proof);
                if (Array.isArray(p)) proof = p;
                console.log("🔍 [FRONTEND] Parsed proof:", proof);
            } catch (e) {
                console.error("❌ [FRONTEND] Error parsing proof:", e);
                throw new Error("Invalid proof data");
            }

            // Convert amount to 6 decimals
            const amount6 = (BigInt(claim.amount ?? 0) * 1000000000000000000n).toString();
            
            console.log("📝 [FRONTEND] Preparing transaction...");
            console.log("📝 [FRONTEND] Contract address:", TREASURY_ADDRESS);
            console.log("📝 [FRONTEND] Function: claim");
            console.log("📝 [FRONTEND] Args:", [BigInt(claim.batch_id), BigInt(amount6), proof]);

            // Send transaction
            console.log("🚀 [FRONTEND] Calling writeContractAsync...");
            const hash = await writeContractAsync({
                address: TREASURY_ADDRESS,
                abi: TreasuryMerkleABI.abi,
                functionName: "claim",
                args: [BigInt(claim.batch_id), BigInt(amount6), proof],
                chainId: TARGET_ID,
            });
            console.log("✅ [FRONTEND] Claim tx submitted:", hash);

            

        } catch (e) {
            console.error("❌ [FRONTEND] Claim error:", e);
            setIsClaiming(false);
            setClaimingClaimId(null);
            
            if (e?.data?.errorName) {
                setError(`Revert: ${e.data.errorName}`);
            } else if (e?.message) {
                setError(e.message);
            } else {
                setError("Claim transaction failed");
            }
        }
    };

    // Handle claim button click
    const handleClaim = async (claim) => {
        // First check if the claim is already claimed on blockchain
        const isAlreadyClaimed = await checkClaimedStatus(claim);
        
        if (isAlreadyClaimed) {
            // Already claimed message is set in checkClaimedStatus function
            return;
        }
        
        // Proceed with blockchain claim if not already claimed
        await handleBlockchainClaim(claim);
    };
    
    // Main effect to fetch data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            if (!userData?.telegram_id) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Step 1: Get wallet address from cbp_users table
                const dbWallet = await getWalletAddressFromDB(userData.telegram_id);
                setDbWalletAddress(dbWallet);
        

                if (!dbWallet) {
                    setError('No wallet address found for this user');
                    setIsLoading(false);
                    return;
                }

                // Step 2: Check if connected wallet matches DB wallet
                const walletMatches = address && dbWallet.toLowerCase() === address.toLowerCase();
                setAddressMatch(walletMatches);

                if (!walletMatches) {
                    setError('Connected wallet does not match registered wallet address');
                    setIsLoading(false);
                    return;
                }

                // Step 3: Fetch pending claims
                const claims = await fetchPendingClaims(dbWallet);
                setClaimsData(claims);

            } catch (err) {
                console.error('Error in fetchData:', err);
                setError('Failed to load claims data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [userData?.telegram_id, address]);

    // Handle transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash && claimingClaimId) {
            console.log("✅ [FRONTEND] Transaction confirmed, updating claim status...");
            (async () => {
                try {
                    setIsClaiming(false);
                    
                    const claim = claimsData.find(c => c.id === claimingClaimId);
                    if (!claim) {
                        console.error("❌ [FRONTEND] Claim not found for confirmation");
                        setError("Transaction successful but claim data not found");
                        return;
                    }
                    
                    // Update claim status in database
                    //await updateClaimStatus(claimingClaimId);
                    
                    // Refresh claims data to reflect the updated status
                    await refreshClaims();
                    
                    setError(null);
                    console.log("✅ [FRONTEND] Claim process completed successfully");
                    
                } catch (err) {
                    console.error("❌ [FRONTEND] Error in confirmation handler:", err);
                    setError(err.message || "Transaction successful but server update failed");
                } finally {
                    setClaimingClaimId(null);
                }
            })();
        }
    }, [isConfirmed, txHash, claimingClaimId]);

    // Handle transaction errors
    useEffect(() => {
        if (isTxError && txError) {
            console.error("❌ [FRONTEND] Transaction failed:", txError);
            setIsClaiming(false);
            setClaimingClaimId(null);
            
            if (txError.cause?.data?.errorName) {
                setError(`Revert: ${txError.cause.data.errorName}`);
            } else if (txError.cause?.shortMessage) {
                setError(txError.cause.shortMessage);
            } else {
                setError(txError.message || "Transaction failed");
            }
        }
    }, [isTxError, txError]);

    return (
        <div>
            <div className="circular-progress-wrapper">
              <MobileCircularProgress userData={userData} />
            </div>

            <div className="claim-page">
                {/* Wallet Connection Status */}
                {!isConnected ? (
                    <div className="wallet-connection-section">
                        <div className="section-header">
                            <div className="header-left">
                                <div className="section-icon">
                                    <img src="/wallet.svg" alt="Wallet" />
                                </div>
                                <span>Connect wallet to view <span className="earning-highlight">claims</span></span>
                            </div>
                        </div>
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <button
                                className="claim-btn"
                                onClick={() => open({ view: "Connect", namespace: "eip155" })}
                                style={{ 
                                    fontSize: "14px", 
                                    padding: "12px 24px",
                                    fontWeight: "bold",
                                    minWidth: "200px"
                                }}
                            >
                                CONNECT WALLET
                            </button>
                        </div>
                    </div>
                ) : wrongChain ? (
                    <div className="wallet-connection-section">
                        <div className="section-header">
                            <div className="header-left">
                                <div className="section-icon">
                                    <img src="/wallet.svg" alt="Wallet" />
                                </div>
                                <span>Switch to <span className="earning-highlight">{TARGET_NAME}</span></span>
                            </div>
                        </div>
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <button
                                className="claim-btn"
                                onClick={ensureTargetChain}
                                style={{ 
                                    fontSize: "14px", 
                                    padding: "12px 24px",
                                    fontWeight: "bold",
                                    minWidth: "200px"
                                }}
                            >
                                SWITCH NETWORK
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Main Title */}
                        <div className="claim-header">
                            <h1>My <span className="earning-highlight">Claims</span></h1>
                        </div>

                        {/* Already Claimed Message */}
                        {alreadyClaimedMessage && (
                            <div className="already-claimed-message" style={{
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                margin: '16px 0',
                                fontSize: '14px',
                                fontWeight: '500',
                                textAlign: 'center'
                            }}>
                                {alreadyClaimedMessage}
                            </div>
                        )}

                {/* Personal Virality Earning Section */}
                <div className="earning-section">
                    <div className="section-header">
                        <div className="header-left">
                            <div className="section-icon">
                                <img src="/bars.svg" alt="Chart" />
                            </div>
                            <span>My Pending <span className="earning-highlight">Claims</span></span>
                        </div>
                        <div className="header-right">
                            <div className="chevron-icon">
                                <img src="/arrow_down.svg" alt="Check" className="check-icon" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="claims-table-container">
                        <div className="claims-table">
                            <div className="table-header">
                                <div className="header-cell">Amount</div>
                                <div className="header-cell">Tier</div>
                                <div className="header-cell">Achieved At</div>
                                <div className="header-cell">Action</div>
                            </div>
                            <div className="table-body">
                                {isLoading ? (
                                    <div className="loading-row">
                                        <div className="table-cell">Loading...</div>
                                        <div className="table-cell">Loading...</div>
                                        <div className="table-cell">Loading...</div>
                                        <div className="table-cell">Loading...</div>
                                    </div>
                                ) : error ? (
                                    <div className="error-row">
                                        <div className="table-cell error-message" colSpan="4">
                                            {error}
                                        </div>
                                    </div>
                                ) : claimsData.length === 0 ? (
                                    <div className="empty-row">
                                        <div className="table-cell empty-message" colSpan="4">
                                            No pending claims available
                                        </div>
                                    </div>
                                ) : (
                                    claimsData.map((claim) => (
                                        <div key={claim.id} className="table-row">
                                            <div className="table-cell"> {claim.amount || '0.00'} USDT</div>
                                            <div className="table-cell">{claim.tier || 'N/A'}</div>
                                            <div className="table-cell">
                                                {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="table-cell">
                                                <button 
                                                    className={`claim-btn ${claim.userclaimed ? 'claimed' : ''}`}
                                                    onClick={() => handleClaim(claim)}
                                                    disabled={
                                                        claim.userclaimed || 
                                                        isClaiming || 
                                                        isConfirming || 
                                                        checkingClaimedStatus ||
                                                        !isConnected || 
                                                        wrongChain ||
                                                        !TREASURY_ADDRESS ||
                                                        !claim.proof
                                                    }
                                                >
                                                    {claim.userclaimed 
                                                        ? 'Claimed' 
                                                        : isClaiming && claimingClaimId === claim.id
                                                        ? 'Claiming...'
                                                        : isConfirming && claimingClaimId === claim.id
                                                        ? 'Confirming...'
                                                        : checkingClaimedStatus
                                                        ? 'Checking...'
                                                        : 'Claim'
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                    </>
                )}
            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
} 