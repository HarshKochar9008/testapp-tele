import React, { useEffect, useState, useRef } from "react";
import "./Plan2.css";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import TodoPopup from '../../components/TodoPopup/TodoPopup';

// Backend URL configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000";

// Supabase configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
  : null;

export default function Plan2({ userData }) {
    const navigate = useNavigate();
    const [userStatus, setUserStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tiers, setTiers] = useState([]);
    const [globalStats, setGlobalStats] = useState({
        totalEarnings: 0,
        personalReferrals: 0,
        personalViralityCommunity: 0,
        globalViralityMomentum: 0
    });
    const [showTodoPopup, setShowTodoPopup] = useState(false);
    const [selectedTierTodo, setSelectedTierTodo] = useState(null);
    const [selectedTierNumber, setSelectedTierNumber] = useState(null);
    const scrollContainerRef = useRef(null);

    // Fetch tiers from backend
    useEffect(() => {
        const fetchTiers = async () => {
            try {
                console.log('📡 [PLAN2] Fetching tiers from backend...');
                
                const response = await axios.get(`${BACKEND_URL}/api/rewards/tiers`, {
                    params: { 
                        min_tier: 1, 
                        max_tier: 28,
                        _: Date.now() 
                    }
                });
                
                setTiers(response.data.tiers || []);
            } catch (error) {
                console.error('❌ [PLAN2] Error fetching tiers:', error);
                setTiers([]);
            }
        };

        fetchTiers();
    }, []);

    // Fetch user status and global stats
    useEffect(() => {
        const fetchUserStatus = async () => {
            if (!userData?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                console.log('📡 [PLAN2] Fetching user status for:', userData.telegram_id);
                
                // Fetch user status
                const statusResponse = await axios.get(`${BACKEND_URL}/api/rewards/status`, {
                    params: { referrer_id: userData.telegram_id }
                });
                
                console.log('📡 [PLAN2] Status response:', statusResponse.data);
                setUserStatus(statusResponse.data);
                
                // Fetch global virality momentum from Supabase
                let globalViralityMomentum = 0;
                let pveEarnings = 0;
                let personalReferrals = 0;
                let personalViralityCommunity = 0;
                
                if (supabase) {
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
                        console.error('❌ [PLAN2] Error fetching user count from Supabase:', gvmErr);
                    } else {
                        globalViralityMomentum = gvmNow || 0;
                        console.log('📡 [PLAN2] Global virality momentum:', globalViralityMomentum);
                    }

                    const { data: userRecord, error: userError } = await supabase
                        .from('cbp_users')
                        .select('id')
                        .eq('telegram_id', userData.telegram_id)
                        .single();

                    const userId = userRecord.id;

                    const { data: userReferralRecord, error: userReferralError } = await supabase
                        .from('referral_counts')
                        .select('*')
                        .eq('referrer_address', userId)
                        .single();
                    
                    if (userReferralError) {
                        console.error('Error fetching user referral:', userReferralError);
                    } else {
                        personalReferrals = userReferralRecord.valid_direct_count || 0;
                        personalViralityCommunity = userReferralRecord.valid_indirect_count || 0;
                    }

                    const { data: pveData, error: pveError } = await supabase
                        .from('income_history')
                        .select('amount')
                        .eq('user_id', userId);

                    if (pveError) {
                        console.error('Error fetching PVE earnings:', pveError);
                    } else if (pveData && pveData.length > 0) {
                        pveEarnings = pveData.reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0);
                    }
                } else {
                    console.warn('⚠️ [PLAN2] Supabase client not configured');
                }
                
                setGlobalStats({
                    totalEarnings: pveEarnings || 0,
                    personalReferrals: personalReferrals || 0,
                    personalViralityCommunity: personalViralityCommunity || 0,
                    globalViralityMomentum: globalViralityMomentum
                });
                
            } catch (error) {
                console.error('❌ [PLAN2] Error fetching user status:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserStatus();
    }, [userData]);

    // Get current tier from user status
    const getCurrentTier = () => {
        if (!userStatus?.ok) return 1;
        return userStatus.currentTier || 1;
    };

    // Get user progress data
    const getUserProgress = () => {
        if (!userStatus?.ok) {
            return { 
                gvm: 0, 
                referrals: 0, 
                teamSize: 0,
                currentTier: 1
            };
        }
        
        return {
            gvm: parseInt(userStatus.nextTier?.currentGvm || 0),
            referrals: userStatus.legs?.length || 0,
            teamSize: parseInt(userStatus.powerLeg || 0) + parseInt(userStatus.powerLeg2 || 0) + parseInt(userStatus.secondLeg || 0),
            currentTier: getCurrentTier()
        };
    };

    const userProgress = getUserProgress();
    const currentTier = getCurrentTier();

    // Scroll to current tier on load
    useEffect(() => {
        if (!loading && tiers.length > 0 && scrollContainerRef.current) {
            setTimeout(() => {
                const currentCard = scrollContainerRef.current.querySelector(`[data-tier="${currentTier}"]`);
                if (currentCard) {
                    currentCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }, 300);
        }
    }, [loading, tiers, currentTier]);

    // Determine tier status
    const getTierStatus = (tierNumber) => {
        if (currentTier > tierNumber) return 'completed';
        if (currentTier === tierNumber) return 'active';
        return 'locked';
    };

    // Get condition text based on tier
    const getCondition = (tierNumber) => {
        if (tierNumber >= 1 && tierNumber <= 3) return null;
        if (tierNumber >= 4 && tierNumber <= 9) return "70:30";
        if (tierNumber >= 10 && tierNumber <= 28) return "70:15:15";
        return null;
    };

    // Get tier icon/emoji
    const getTierIcon = (tierNumber, status) => {
        if (status === 'completed') return '🏆';
        if (status === 'active') return '⚡';
        if (tierNumber <= 3) return '🌟';
        if (tierNumber <= 9) return '💎';
        if (tierNumber <= 15) return '👑';
        if (tierNumber <= 21) return '🔥';
        return '🚀';
    };

    // Get tier progress percentage for active tier
    const getTierProgress = (tier) => {
        if (getTierStatus(tier.tier_no) !== 'active') return 0;
        
        const gvmProgress = (userProgress.gvm / tier.cumulative_gvm) * 100;
        const referralProgress = tier.tier_no >= 4 
            ? (userProgress.teamSize / tier.valid_total_required) * 100
            : (userProgress.referrals / tier.direct_required) * 100;
        
        return Math.min((gvmProgress + referralProgress) / 2, 100);
    };

    // Handle todo popup opening
    const handleTierCardClick = (tierNumber) => {
        const status = getTierStatus(tierNumber);
        if (status === 'active' && userStatus?.todo) {
            setSelectedTierTodo(userStatus.todo);
            setSelectedTierNumber(tierNumber);
            setShowTodoPopup(true);
        }
    };

    // Close todo popup
    const closeTodoPopup = () => {
        setShowTodoPopup(false);
        setSelectedTierTodo(null);
        setSelectedTierNumber(null);
    };

    if (loading) {
        return (
            <div className="plan2-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your game levels...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="plan2-page">
                <div className="error-container">
                    <p>Error loading levels: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="plan2-page">
            {/* Header Section */}
            <div className="plan2-header">
                <div className="user-greeting">
                    <h2>🎮 Welcome, {userData?.username}!</h2>
                    <p className="referral-id">ID: {userData?.referral_id}</p>
                </div>
                
                <div className="global-stats-card">
                    <div className="stat-glow"></div>
                    <h3>{globalStats.globalViralityMomentum.toLocaleString()}+</h3>
                    <p>Global iEX Buyers</p>
                </div>

                <div className="current-level-badge">
                    <span className="badge-icon">🎯</span>
                    <span className="badge-text">Level {currentTier} of 28</span>
                </div>
            </div>

            {/* Tier Cards Slider */}
            <div className="tiers-section">
                <h3 className="section-title">🏆 YOUR CBP GLOBAL VIRALITY INDEX LEVELS</h3>
                
                <div className="tiers-scroll-container" ref={scrollContainerRef}>
                    <div className="tiers-track">
                        {tiers.map((tier, index) => {
                            const status = getTierStatus(tier.tier_no);
                            const condition = getCondition(tier.tier_no);
                            const progress = getTierProgress(tier);
                            const icon = getTierIcon(tier.tier_no, status);

                            return (
                                <div 
                                    key={tier.tier_no} 
                                    className={`tier-card ${status}`}
                                    data-tier={tier.tier_no}
                                    onClick={() => handleTierCardClick(tier.tier_no)}
                                    style={{ cursor: status === 'active' ? 'pointer' : 'default' }}
                                >
                                    {/* Card Glow Effect */}
                                    <div className="card-glow"></div>
                                    
                                    {/* Status Badge */}
                                    <div className="tier-status-badge">
                                        {status === 'completed' && '✅ COMPLETED'}
                                        {status === 'active' && '🔄 IN PROGRESS'}
                                        {status === 'locked' && '🔒 LOCKED'}
                                    </div>

                                    {/* Tier Number & Icon */}
                                    <div className="tier-header">
                                        <div className="tier-icon-wrapper">
                                            <span className="tier-icon">{icon}</span>
                                        </div>
                                        <h2 className="tier-number">LEVEL {tier.tier_no}</h2>
                                    </div>

                                    

                                    {/* Tier Details */}
                                    <div className="tier-details">
                                        {/* PVE Earning */}
                                        <div className="detail-item">
                                            <div className="detail-icon">💰</div>
                                            <div className="detail-content">
                                                <span className="detail-label">Personal Virality Earning</span>
                                                <span className="detail-value reward">${tier.pve_amount_usd}</span>
                                            </div>
                                        </div>
                                        
                                        {/* GVM Requirement */}
                                        <div className="detail-item">
                                            <div className="detail-icon">🌐</div>
                                            <div className="detail-content">
                                                <span className="detail-label">GVM Required</span>
                                                <span className="detail-value">
                                                    {tier.tier_no === 1 
                                                        ? `First ${tier.cumulative_gvm}` 
                                                        : `${tier.cumulative_gvm}`}
                                                    {status === 'active' && (
                                                        <span className="progress-info">
                                                            {' '}• Your Progress: <span className="secured">{userProgress.gvm}</span>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        

                                        {/* PVC Requirement */}
                                        <div className="detail-item">
                                            <div className="detail-icon">👥</div>
                                            <div className="detail-content">
                                                <span className="detail-label">
                                                    {tier.tier_no >= 3 ? 'Total Referrals Required' : 'Direct Referrals Required'}
                                                </span>
                                                <span className="detail-value">
                                                {tier.tier_no >= 4? tier.valid_total_required
                                                    : tier.tier_no === 3
                                                        ? `${tier.direct_required} (Directs) + ${tier.valid_total_required} (Team)`
                                                        : tier.direct_required}

                                                    {status === 'active' && (
                                                        <span className="progress-info">
                                                            {' '}• Your Progress: <span className="secured">
                                                                {tier.tier_no >= 4 ? userProgress.teamSize : userProgress.referrals}
                                                            </span>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Condition */}
                                        {condition && (
                                            <div className="detail-item condition">
                                                <div className="detail-icon">⚖️</div>
                                                <div className="detail-content">
                                                    <span className="detail-label">Condition</span>
                                                    <span className="detail-value">Condition Applied : {condition}</span>
                                                </div>
                                            </div>
                                        )}
                                        {!condition && (
                                            <div className="detail-item condition">
                                                <div className="detail-icon">⚖️</div>
                                                <div className="detail-content">
                                                    <span className="detail-label">Condition</span>
                                                    <span className="detail-value">No Condition Applied                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tier Footer */}
                                    <div className="tier-footer">
                                        {status === 'completed' && (
                                            <button className="tier-action-btn completed">
                                                <span>✓</span> Completed
                                            </button>
                                        )}
                                        {status === 'active' && (
                                            <button className="tier-action-btn active">
                                                <span>⚡</span> In Progress
                                            </button>
                                        )}
                                        {status === 'locked' && (
                                            <button className="tier-action-btn locked">
                                                <span>🔒</span> Complete Previous Level
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation Hint */}
                <div className="scroll-hint">
                    <span>← Swipe to explore all levels →</span>
                </div>
            </div>

            {/* Stats Section */}
            <div className="plan2-stats-section">
                <h3 className="section-title">📊 YOUR STATS</h3>
                
                <div className="stats-grid-new">
                    <div className="stat-card">
                        <div className="stat-icon"></div>
                        <div className="stat-label">My Total Earnings</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>${globalStats.totalEarnings}</span>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon"></div>
                        <div className="stat-label">My Personal Referrals</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>{globalStats.personalReferrals}</span>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon"></div>
                        <div className="stat-label">My Personal Virality Community</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>{globalStats.personalViralityCommunity}</span>
                        </div>
                    </div>
                </div>

                <p className="disclaimer-text">
                    💡 Disclaimer - Personal Virality Earnings in Eonx CBP Viral Model is not guaranteed. 
                    It fully depends on each user's effort, performance, and activity. All stated Personal 
                    Virality Earnings are gross and do not include any applicable taxes.
                </p>
            </div>

            {/* Bottom Image */}
            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>

            {/* Todo Popup */}
            <TodoPopup 
                isOpen={showTodoPopup}
                onClose={closeTodoPopup}
                todoList={selectedTierTodo}
                tierNumber={selectedTierNumber}
            />
        </div>
    );
}

