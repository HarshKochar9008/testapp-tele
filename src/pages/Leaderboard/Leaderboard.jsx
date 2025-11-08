import React, { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';
import "./Leaderboard.css";
import { useNotification } from '../../context/NotificationContext';

export default function Leaderboard({ userData }) {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    // Supabase configuration - moved outside component to prevent recreation
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
    const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

    // Function to mask user data (show first 2 and last 2 characters)
    const maskUserData = (data) => {
        if (!data || data.length <= 4) return data;
        return data.substring(0, 2) + "***" + data.substring(data.length - 2);
    };

    // Function to get badge type based on rank (3-15 silver, 16-50 bronze)
    const getBadgeType = (rank) => {
        if (rank <= 2) return 'gold';
        if (rank <= 15) return 'silver';
        if (rank <= 50) return 'bronze';
        return 'none';
    };

    // Generate initials from username for avatar circles
    const getInitials = (name) => {
        if (!name) return '??';
        const trimmed = String(name).trim();
        if (!trimmed) return '??';
        const parts = trimmed.split(/\s+/);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Function to get badge icon (using emoji icons for reliability)
    const getBadgeIcon = (badgeType) => {
        switch (badgeType) {
            case 'gold':
                return '🥇';
            case 'silver':
                return '🥈';
            case 'bronze':
                return '🥉';
            default:
                return '⭐';
        }
    };

    // Fetch leaderboard data
    useEffect(() => {
        const fetchLeaderboardData = async () => {
            try {
                setLoading(true);
                
                // Always use mock data for now to ensure leaderboard works
                // This can be replaced with real API calls later
                const mockData = [
                    { id: 1, username: "CryptoKing", user_id: "123456789", earnings: 125000 },
                    { id: 2, username: "BlockMaster", user_id: "987654321", earnings: 98000 },
                    { id: 3, username: "TokenHunter", user_id: "456789123", earnings: 87000 },
                    { id: 4, username: "EarnPro", user_id: "789123456", earnings: 75000 },
                    { id: 5, username: "ViralEarn", user_id: "321654987", earnings: 68000 },
                    { id: 6, username: "CryptoGuru", user_id: "654987321", earnings: 62000 },
                    { id: 7, username: "BlockEarn", user_id: "147258369", earnings: 58000 },
                    { id: 8, username: "TokenPro", user_id: "369258147", earnings: 54000 },
                    { id: 9, username: "EarnMaster", user_id: "258147369", earnings: 51000 },
                    { id: 10, username: "CryptoEarn", user_id: "741852963", earnings: 48000 },
                    { id: 11, username: "ViralKing", user_id: "963852741", earnings: 45000 },
                    { id: 12, username: "BlockPro", user_id: "852741963", earnings: 42000 },
                    { id: 13, username: "TokenKing", user_id: "159753486", earnings: 39000 },
                    { id: 14, username: "EarnGuru", user_id: "486159753", earnings: 36000 },
                    { id: 15, username: "CryptoPro", user_id: "753486159", earnings: 33000 },
                    { id: 16, username: "ViralPro", user_id: "357159486", earnings: 30000 },
                    { id: 17, username: "BlockKing", user_id: "486357159", earnings: 28000 },
                    { id: 18, username: "TokenEarn", user_id: "159486357", earnings: 26000 },
                    { id: 19, username: "EarnKing", user_id: "753159486", earnings: 24000 },
                    { id: 20, username: "CryptoKing2", user_id: "486753159", earnings: 22000 },
                    { id: 21, username: "ViralMaster", user_id: "159753486", earnings: 20000 },
                    { id: 22, username: "BlockGuru", user_id: "486159753", earnings: 18000 },
                    { id: 23, username: "TokenEarn2", user_id: "753486159", earnings: 16000 },
                    { id: 24, username: "CryptoPro2", user_id: "357159486", earnings: 14000 },
                    { id: 25, username: "EarnViral", user_id: "486357159", earnings: 12000 },
                    { id: 26, username: "ViralBlock", user_id: "159486357", earnings: 10000 },
                    { id: 27, username: "BlockToken", user_id: "753159486", earnings: 9000 },
                    { id: 28, username: "TokenCrypto", user_id: "486753159", earnings: 8000 },
                    { id: 29, username: "CryptoBlock", user_id: "159753486", earnings: 7000 },
                    { id: 30, username: "EarnBlock", user_id: "486159753", earnings: 6000 },
                ];
                
                setLeaderboardData(mockData);
                setLoading(false);
                
            } catch (error) {
                console.error('Error in leaderboard fetch:', error);
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, []); // Empty dependency array to run only once on mount

    // Format earnings with commas (kept for future use)
    const formatEarnings = (earnings) => {
        return earnings.toLocaleString();
    };

    // Mask earnings display as requested
    const renderMaskedEarnings = () => '****** USDT';

    if (loading) {
        return (
            <div className="leaderboard-page">
                <div className="leaderboard-header">
                    <h1>CBP Viral Earners Leaderboard</h1>
                    <p>See who's leading the viral earning game!</p>
                </div>
                <div className="loader-container">
                    <div className="loader"></div>
                    <p>Loading leaderboard...</p>
                </div>
            </div>
        );
    }

    const topThree = leaderboardData.slice(0, 3);
    const remaining = leaderboardData.slice(3);

    return (
        <div className="leaderboard-page">
            
            {/* Gamified Podium Section */}
            {topThree.length > 0 && (
                <div className="podium-section">
                    <div className="podium-title">
                        <span className="podium-icon">🏆</span>
                        <h2>VIRAL CHAMPIONS PODIUM</h2>
                        <span className="podium-icon">🏆</span>
                    </div>
                    
                    <div className="podium-container">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="podium-card second-place">
                                <div className="podium-base silver">
                                    <div className="rank-number">2</div>
                                </div>
                                <div className="player-card silver">
                                    <div className="crown-icon">🥈</div>
                                    <div className="player-avatar silver">
                                        {getInitials(topThree[1].username)}
                                    </div>
                                    <div className="player-info">
                                        <div className="player-name">{maskUserData(topThree[1].username)}</div>
                                        <div className="player-earnings">{renderMaskedEarnings()}</div>
                                    </div>
                                    <div className="achievement-badge silver">SILVER LEGEND</div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="podium-card first-place">
                                <div className="podium-base gold">
                                    <div className="rank-number">1</div>
                                </div>
                                <div className="player-card gold">
                                    <div className="crown-icon">👑</div>
                                    <div className="player-avatar gold">
                                        {getInitials(topThree[0].username)}
                                    </div>
                                    <div className="player-info">
                                        <div className="player-name">{maskUserData(topThree[0].username)}</div>
                                        <div className="player-earnings emphasis">{renderMaskedEarnings()}</div>
                                    </div>
                                    <div className="achievement-badge gold">VIRAL CHAMPION</div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="podium-card third-place">
                                <div className="podium-base bronze">
                                    <div className="rank-number">3</div>
                                </div>
                                <div className="player-card bronze">
                                    <div className="crown-icon">🥉</div>
                                    <div className="player-avatar bronze">
                                        {getInitials(topThree[2].username)}
                                    </div>
                                    <div className="player-info">
                                        <div className="player-name">{maskUserData(topThree[2].username)}</div>
                                        <div className="player-earnings">{renderMaskedEarnings()}</div>
                                    </div>
                                    <div className="achievement-badge bronze">BRONZE HERO</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Gamified Leaderboard Grid */}
            <div className="leaderboard-section">
                <div className="section-header">
                    <span className="section-icon">⚔️</span>
                    <h3>BATTLE ARENA RANKINGS</h3>
                    <span className="section-icon">⚔️</span>
                </div>
                
                <div className="leaderboard-container">
                    {remaining && remaining.length > 0 ? (
                        remaining.map((user, index) => {
                            const rank = index + 4; // Start from rank 4
                            const badgeType = getBadgeType(rank);
                            const badgeIcon = getBadgeIcon(badgeType);
                            const tierLevel = rank <= 15 ? 'ELITE' : rank <= 50 ? 'VETERAN' : 'RISING';
                            
                            return (
                                <div key={user.id || index} className={`game-card-leaderboard ${badgeType}`}>
                                    <div className="card-glow-effect"></div>
                                    
                                    <div className="rank-display">
                                        <div className="rank-badge">
                                            <span className="rank-number">{rank}</span>
                                        </div>
                                        {/* <div className="tier-label">{tierLevel}</div> */}
                                    </div>
                                    
                                    <div className="player-section">
                                        <div className="player-avatar-small">
                                            {getInitials(user.username || 'Anonymous')}
                                        </div>
                                        <div className="player-details">
                                            <div className="player-name">
                                                {maskUserData(user.username || 'Anonymous')}
                                            </div>
                                            <div className="player-id">
                                                ID: {maskUserData(user.user_id || '000000000')}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="score-section">
                                        <div className="score-label">SCORE</div>
                                        <div className="score-value">{renderMaskedEarnings()}</div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-data">
                            <div className="no-data-icon">😞</div>
                            <p>No warriors in the arena yet!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
