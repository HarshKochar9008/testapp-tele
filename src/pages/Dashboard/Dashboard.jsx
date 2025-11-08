import React, { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import MobileCircularProgress from "../../components/MobileCircularProgress/MobileCircularProgress";
import LinkCard from "../../components/LinkCard/LinkCard";
import GameLinkCard from "../../components/GameLinkCard/GameLinkCard";
import MemesCarousel from "../../components/MemesCarousel/MemesCarousel";
import CBPInstructionsPopup from "../../components/CBPInstructionsPopup/CBPInstructionsPopup";
import useCBPInstructionsPopup from "../../hooks/useCBPInstructionsPopup";
import { useNotification } from '../../context/NotificationContext';
import {
    useAccount,
    useBalance
  } from "wagmi";
  import { bsc } from "wagmi/chains";

export default function Dashboard({ userData, token,fetchUserData }) {
    const [blocksMined, setBlocksMined] = useState(0);
    const [globalViralityMomentum, setGlobalViralityMomentum] = useState(0);
    const [showWhitepaperDropdown, setShowWhitepaperDropdown] = useState(false);
    const [isExclusive, setIsExclusive] = useState(false);
    const { showComingSoon, showNotification } = useNotification();
    const { showPopup, closePopup } = useCBPInstructionsPopup();
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();

    const ENV = (typeof process !== "undefined" && process.env) ? process.env : {};

    const TOKEN_ADDRESS = ENV.REACT_APP_TOKEN_ADDRESS || "0xf6856227C0f7F20a5B923D9a37C6F7Ee55Af9CbF";

    const fmtUsdtInt = (val) => {
        if (!val) return "0";
        // Convert BigInt to string and handle 18 decimals
        const valueStr = val.toString();
        if (valueStr.length <= 18) {
            // If the number is smaller than 18 digits, it's less than 1 token
            return "0";
        }
        // Remove the last 18 digits (decimals) and add decimal point
        const integerPart = valueStr.slice(0, -18);
        const decimalPart = valueStr.slice(-18);
        
        // Remove trailing zeros from decimal part
        const trimmedDecimal = decimalPart.replace(/0+$/, '');
        
        if (trimmedDecimal === '') {
            return integerPart;
        }
        
        return `${integerPart}.${trimmedDecimal}`;
      };

    const {
        data: tokenBalance,
        isLoading: tokenLoading,
      } = useBalance({
        address,
        token: TOKEN_ADDRESS,
        chainId: bsc.id,
        watch: true,
        enabled: Boolean(address && TOKEN_ADDRESS),
      });

    // Supabase configuration (conditional like in Plan.jsx)
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
    const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
    const supabase = (SUPABASE_URL && SUPABASE_ANON)
      ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
      : null;

    // Function to download PDF files
    const downloadPDF = (filename) => {
        try {
            console.log(`📥 Attempting to download: ${filename}`);
            
            const link = document.createElement('a');
            link.href = `/${filename}`;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Download initiated for: ${filename}`);
        } catch (error) {
            console.error(`❌ Error downloading ${filename}:`, error);
            showNotification(`Error downloading ${filename}`, 'error');
        }
    };

    // Function to handle whitepaper dropdown toggle
    const handleWhitepaperClick = () => {
        setShowWhitepaperDropdown(!showWhitepaperDropdown);
    };

    // Function to handle individual PDF download
    const handlePDFDownload = (filename, displayName) => {
        downloadPDF(filename);
        showNotification(`Downloading ${displayName}...`, 'success');
        setShowWhitepaperDropdown(false); // Close dropdown after download
    };

    // Function to handle opening external links (e.g., Linktree)
    const handleOpenExternal = (url, message = 'Opening...') => {
        try {
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            showNotification(message, 'success');
        } catch (error) {
            console.error('Error opening link:', error);
            showNotification('Unable to open link', 'error');
        } finally {
            setShowWhitepaperDropdown(false);
        }
    };

    // Fetch user data & reward history when token changes
    useEffect(() => {
        if (token) {
            fetchUserData(token);
        }
    }, [token]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showWhitepaperDropdown && !event.target.closest('.whitepaper-dropdown') && !event.target.closest('.link-card')) {
                setShowWhitepaperDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showWhitepaperDropdown]);

    useEffect(() => {
        if (userData) {
            setBlocksMined(userData.total_blocks_mined);
        }
    }, [userData]);

    useEffect(() => {
        const fetchExclusivity = async () => {
            try {
                if (!supabase || !userData?.telegram_id) return;
                const { data, error } = await supabase
                    .from('cbp_users')
                    .select('is_exclusive, username')
                    .eq('telegram_id', userData.telegram_id)
                    .single();
                if (error) return;
                const hasName = Boolean(data?.username && String(data.username).trim().length > 0);
                setIsExclusive(Boolean(data?.is_exclusive) && hasName);
            } catch (_) {
            }
        };
        fetchExclusivity();
    }, [supabase, userData?.telegram_id]);

    // Fetch global virality momentum (MAX gvm_index) from Supabase
    useEffect(() => {
        const fetchGlobalMomentum = async () => {
            try {
                if (!supabase) return;
                // const { data, error } = await supabase
                //     .from('cbp_users')
                //     .select('gvm_index')
                //     .not('gvm_index', 'is', null)
                //     .order('gvm_index', { ascending: false })
                //     .limit(1)
                //     .single();

                    const { count: gvmNow, error: gvmErr } = await supabase
                    .from("cbp_users")
                    .select("*", { count: "exact", head: true })
                    .not("gvm_index", "is", null);
                    
                if (gvmErr) {
                    console.error('❌ [DASHBOARD] Error fetching max gvm_index from Supabase:', gvmErr);
                    return;
                }
                
                setGlobalViralityMomentum(gvmNow || 0);
            } catch (e) {
                console.error('❌ [DASHBOARD] Unexpected error fetching global momentum:', e);
            }
        };
        fetchGlobalMomentum();
    }, [supabase]);

    // Simulate blocks mined auto-increment
    useEffect(() => {
        const interval = setInterval(() => {
            setBlocksMined((prev) => prev + Math.floor(Math.random() * 3));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const linkCards = [
        {
            title: "What is EonX?",
            subtitle: "Introduction",
            icon: "/heart_icon.svg",
            link: "/story",
        },
        {
            title: "Whitepaper",
            subtitle: "Download Our Guide",
            icon: "/file_icon.svg",
            link: "#",
            onClick: handleWhitepaperClick,
        },
        {
            title: "Buy iEX Smart Tokens",
            subtitle: "Buy with USDT",
            icon: "/up_down_arrow_icon.svg",
            link: "/buy",
        },
        {
            title: "Claim your Earnings",
            subtitle: "Withdraw your rewards",
            icon: "/coins_icon.svg",
            link: "/claim",
        },
    ];

    const gameLinks = [
        {
          icon: "/layer.svg",
          title: "Earn NFT",
          subtitle: "",
          link:"https://t.me/Eonxx_bot?startapp=home",
          buttonText: "Open",
        },
        {
          icon: "/play.svg",
          title: "My PVC",
          subtitle: "",
          link:"/pvc",
          buttonText: "PVC",
        },
        // {
        //   icon: "/trophy_icon.svg",
        //   title: "Leaderboard",
        //   subtitle: "Top Viral Earners",
        //   link:"/leaderboard",
        //   buttonText: "View",
        // },
      ];
      


    return (
        <div>
            <CBPInstructionsPopup isOpen={showPopup} onClose={closePopup} />
            <div className="dashboard-page">
                <div className="user-greeting">
                    <div className="greeting-main ">
                        Hi <span className="username-dash">{userData?.username}</span> 
                        {isExclusive && (<img src="/verified.svg" alt="tick"/>) } 
                        <span className="username-dash">({userData?.referral_id})</span>
                    </div>
                    {isExclusive && (
                        <div className="greeting-subtitle silver">
                            You are an Exclusive EonX AI Partner.
                        </div>
                    )}
                    <div className="greeting-action">
                        Ready to Earn?
                    </div>
                </div>

                <div className="stats-box">
                    <div className="stats-content">
                        {/* Left */}
                        <div className="stats-item">
                            <img src="/Coin-eonx.png" alt="Star Icon" className="Coin-icon" style={{width: "40px", height: "40px"}} />
                            <div className="stats-text">
                                <div className="label">Global iEX Buyers</div>
                                <h2>{globalViralityMomentum}</h2>
                            </div>
                        </div>

                        {/* Divider */}
                        <img src="/line.png" alt="divider" className="stats-divider" />

                        {/* Right */}
                        <div className="stats-item" style={{justifyContent: "center"}}>
                            <img src="/coins_icon.svg" alt="Coins Icon" className="stats-icon" />
                            <div className="stats-text">
                                <div className="label">Total Blocks Mined</div>
                                <div className="value">{blocksMined}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="circular-progress-wrapper">
                    <MobileCircularProgress userData={userData} />
                    {isConnected && TOKEN_ADDRESS && (
                        <div className="token-balance-display">
                            You have <span className="token-count">
                            {tokenLoading
                                ? "Loading..."
                                : `${fmtUsdtInt(tokenBalance?.value)}`}
                            </span> iEX Smart Tokens in your wallet.
                        </div>
                    )}
                </div>

                <div className="link-card-wrapper px-3 py-4 d-block d-md-none">
                    {linkCards.map((item, idx) => (
                        <LinkCard 
                            key={idx} 
                            title={item.title}
                            subtitle={item.subtitle}
                            icon={item.icon}
                            link={item.link}
                            onClick={item.onClick}
                        />
                    ))}
                </div>

                {/* Whitepaper Dropdown */}
                {showWhitepaperDropdown && (
                    <div className="whitepaper-dropdown px-3 py-2 d-block d-md-none">
                        <div className="dropdown-item" onClick={() => handlePDFDownload('EonX_AI_Whitepaper.pdf', 'EonX AI Whitepaper')}>
                            <div className="dropdown-content">
                                <img src="/file_icon.svg" className="dropdown-icon" alt="PDF" />
                                <div>
                                    <div className="dropdown-title">EonX AI Whitepaper</div>
                                    <div className="dropdown-subtitle">Token Economics & Distribution</div>
                                </div>
                            </div>
                            <img src="/arrow_end.svg" alt="arrow" />
                        </div>
                        <div className="dropdown-item" onClick={() => handlePDFDownload('CBPViralModelBlueprint.pdf', 'CBP Viral Model Blueprint')}>
                            <div className="dropdown-content">
                                <img src="/file_icon.svg" className="dropdown-icon" alt="PDF" />
                                <div>
                                    <div className="dropdown-title">CBP Viral Model Blueprint</div>
                                    <div className="dropdown-subtitle">Community Building Protocol</div>
                                </div>
                            </div>
                            <img src="/arrow_end.svg" alt="arrow" />
                        </div>
                        <div className="dropdown-item" onClick={() => handleOpenExternal('https://linktr.ee/eonx_ai_CBP', 'Opening Linktree...')}>
                            <div className="dropdown-content">
                                <img src="/file_icon.svg" className="dropdown-icon" alt="Linktree" />
                                <div>
                                    <div className="dropdown-title">Linktree</div>
                                    <div className="dropdown-subtitle">CBP Viral Model Hub</div>
                                </div>
                            </div>
                            <img src="/arrow_end.svg" alt="arrow" />
                        </div>
                    </div>
                )}
                <p className="section-title">NFTs and Community</p>

                <div className="game-link-wrapper px-3 py-4 d-block d-md-none">
                    {gameLinks.map((item, idx) => (
                    <GameLinkCard
                        key={idx}
                        {...item}
                        onClick={() => {
                        if (item.link.startsWith("https://t.me/")) {
                            window.Telegram.WebApp.openTelegramLink(item.link);
                        } else {
                            navigate(item.link);
                        }
                        }}
                    />
                    ))}
                </div>
                <div className="memes-wrapper px-3 py-4 d-block d-md-none">
                    <MemesCarousel name={"Memes"} category="default" />
                </div>
                
            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
}