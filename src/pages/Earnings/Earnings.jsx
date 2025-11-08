import React, { useState, useEffect } from "react";
import "./Earnings.css";
import { useAccount } from "wagmi";
import { supabase } from "../../lib/supabaseClient";

export default function Earnings({ userData }) {
    const { address } = useAccount();
    const [pveEarnings, setPveEarnings] = useState([]);
    const [horEarnings, setHorEarnings] = useState([]);
    const [rpEarnings, setRpEarnings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEarnings = async () => {
            if (!userData?.telegram_id) {
                setLoading(false);
                return;
            }

            try {
                // First, get the user's id from cbp_users table using telegram_id
                const { data: userRecord, error: userError } = await supabase
                    .from('cbp_users')
                    .select('id')
                    .eq('telegram_id', userData.telegram_id)
                    .single();

                if (userError) {
                    console.error('Error fetching user:', userError);
                    setLoading(false);
                    return;
                }

                if (!userRecord) {
                    console.log('User not found');
                    setLoading(false);
                    return;
                }

                const userId = userRecord.id;

                // Fetch PVE (Personal Virality Earning) income
                const { data: pveData, error: pveError } = await supabase
                    .from('income_history')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('income_type', 'pve')
                    .order('created_at', { ascending: false });

                if (pveError) {
                    console.error('Error fetching PVE earnings:', pveError);
                } else {
                    setPveEarnings(pveData || []);
                }

                // Fetch HOR (Head On Referral) income
                const { data: horData, error: horError } = await supabase
                    .from('income_history')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('income_type', 'hor')
                    .order('created_at', { ascending: false });

                if (horError) {
                    console.error('Error fetching HOR earnings:', horError);
                } else {
                    setHorEarnings(horData || []);
                }

                // Fetch RP (Referral Program) income
                const { data: rpData, error: rpError } = await supabase
                    .from('income_history')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('income_type', 'rp')
                    .order('created_at', { ascending: false });

                if (rpError) {
                    console.error('Error fetching RP earnings:', rpError);
                } else {
                    setRpEarnings(rpData || []);
                }

            } catch (error) {
                console.error('Error in fetchEarnings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [userData]);

    return (
        <div>
            <div className="earnings-page">
               

                {/* Main Title */}
                <div className="earnings-header">
                    <h1>My <span className="earning-highlight" style={{fontSize: "22px"}}>Earning</span></h1>
                </div>

                {/* Personal Virality Earning Section */}
                <div className="earning-section">
                    <div className="section-header">
                        <div className="header-left">
                            <div className="section-icon">
                                <img src="/bars.svg" alt="Chart" />
                            </div>
                            <span>My Personal Virality <span className="earning-highlight">Earning</span></span>
                        </div>
                        <div className="header-right">
                            <div className="chevron-icon">
                                <img src="/arrow_down.svg" alt="Check" className="check-icon" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="earning-cards">
                        {loading ? (
                            <div className="earning-card">
                                <div className="card-center">Loading...</div>
                            </div>
                        ) : pveEarnings.length > 0 ? (
                            pveEarnings.map((earning, index) => (
                                <div className="earning-card" key={earning.id || index}>
                                    <div className="card-left">{userData?.username || "User"}</div>
                                    <div className="card-center">{earning.description || "Personal Virality Earning"}</div>
                                    <div className="card-right">$ {parseFloat(earning.amount || 0).toFixed(2)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="earning-card">
                                <div className="card-center">No Personal Virality Earnings yet</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Head On Referral Earning Section */}
                <div className="earning-section">
                    <div className="section-header">
                        <div className="header-left">
                            <img src="/flower.svg" alt="Network" className="section-icon" />
                            <span>My Head On Referal <span className="earning-highlight">Earning</span></span>
                        </div>
                        <div className="header-right">
                            <div className="chevron-icon">
                                <img src="/arrow_down.svg" alt="Check" className="check-icon" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="earning-cards">
                        {loading ? (
                            <div className="earning-card">
                                <div className="card-center">Loading...</div>
                            </div>
                        ) : horEarnings.length > 0 ? (
                            horEarnings.map((earning, index) => (
                                <div className="earning-card" key={earning.id || index}>
                                    <div className="card-left">{userData?.username || "User"}</div>
                                    <div className="card-center">{earning.description || "Head On Referral Earning"}</div>
                                    <div className="card-right">$ {parseFloat(earning.amount || 0).toFixed(2)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="earning-card">
                                <div className="card-center">No Head On Referral Earnings yet</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Referral Program Earning Section */}

                <div className="earning-section">
                    <div className="section-header">
                        <div className="header-left">
                            <img src="/flower.svg" alt="Network" className="section-icon" />
                            <span>My Referral Program <span className="earning-highlight">Earning</span></span>
                        </div>
                        <div className="header-right">
                            <div className="chevron-icon">
                                <img src="/arrow_down.svg" alt="Check" className="check-icon" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="earning-cards">
                        {loading ? (
                            <div className="earning-card">
                                <div className="card-center">Loading...</div>
                            </div>
                        ) : rpEarnings.length > 0 ? (
                            rpEarnings.map((earning, index) => (
                                <div className="earning-card" key={earning.id || index}>
                                    <div className="card-left">{userData?.username || "User"}</div>
                                    <div className="card-center">{earning.description || "Head On Referral Earning"}</div>
                                    <div className="card-right">$ {parseFloat(earning.amount || 0).toFixed(2)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="earning-card">
                                <div className="card-center">No Referral Program Earnings yet</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Level Table Section */}
                <div className="level-table-section">
                    <h2>Level Structure</h2>
                    <div className="level-table">
                        <div className="level-header">
                            <div className="level-header-cell">LEVEL</div>
                            <div className="level-header-cell">PERCENTAGE</div>
                            <div className="level-header-cell">NOTES</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">1</div>
                            <div className="level-cell">2.00%</div>
                            <div className="level-cell">Direct Upline - Highest share</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">2</div>
                            <div className="level-cell">1.50%</div>
                            <div className="level-cell">Strong second-tier incentive</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">3</div>
                            <div className="level-cell">1%</div>
                            <div className="level-cell">Balanced for expansion</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">4</div>
                            <div className="level-cell">0.80%</div>
                            <div className="level-cell">Moderate depth support</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">5</div>
                            <div className="level-cell">0.60%</div>
                            <div className="level-cell">Smooth tapering begins</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">6</div>
                            <div className="level-cell">0.50%</div>
                            <div className="level-cell">Continues earning potential</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">7</div>
                            <div className="level-cell">0.40%</div>
                            <div className="level-cell">Deeper level encouragement</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">8</div>
                            <div className="level-cell">0.30%</div>
                            <div className="level-cell">Consistent activity reward</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">9</div>
                            <div className="level-cell">0.30%</div>
                            <div className="level-cell">Sustained depth motivation</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">10</div>
                            <div className="level-cell">0.25%</div>
                            <div className="level-cell">Strategic structural payout</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">11</div>
                            <div className="level-cell">0.20%</div>
                            <div className="level-cell">Deeper team structure reward</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">12</div>
                            <div className="level-cell">0.20%</div>
                            <div className="level-cell">-</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">13</div>
                            <div className="level-cell">0.20%</div>
                            <div className="level-cell">-</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">14</div>
                            <div className="level-cell">0.15%</div>
                            <div className="level-cell">-</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">15</div>
                            <div className="level-cell">0.15%</div>
                            <div className="level-cell">-</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">16</div>
                            <div className="level-cell">0.15%</div>
                            <div className="level-cell">-</div>
                        </div>
                        <div className="level-row">
                            <div className="level-cell">17</div>
                            <div className="level-cell">0.10%</div>
                            <div className="level-cell">Keeps wide structure active</div>
                        </div>
                    </div>
                </div>

                {/* Explanation Text */}
                <div className="explanation-text">
                    <p>
                        Buyer Earn From Your Referral's <span className="highlight">Head-On Earning</span>, As Well As From The <span className="highlight">Head-On Referral Earnings</span> Of Your Personal Community, Based On The Chart Below Upto 17th Level.
                    </p>
                </div>
            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
} 