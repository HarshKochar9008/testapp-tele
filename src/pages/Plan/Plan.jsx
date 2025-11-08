import React, { useEffect, useState } from "react";
import "./Plan.css";
import PlanTable from "../../components/PlanTable/PlanTable";
import { useNavigate } from "react-router-dom";
import { useNotification } from '../../context/NotificationContext';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Backend URL configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000";

// Supabase configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
  : null;

export default function Plan({ userData }) {
    const navigate = useNavigate();
    const [userStatus, setUserStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [globalStats, setGlobalStats] = useState({
        totalEarnings: 0,
        personalReferrals: 0,
        personalViralityCommunity: 0,
        globalViralityMomentum: 0
    });

    // Fetch user status and global stats from backend
    useEffect(() => {
        const fetchUserStatus = async () => {
            if (!userData?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                console.log('📡 [PLAN] Fetching user status for:', userData.telegram_id);
                
                // Fetch user status
                const statusResponse = await axios.get(`${BACKEND_URL}/api/rewards/status`, {
                    params: { referrer_id: userData.telegram_id }
                });
                
                console.log('📡 [PLAN] Status response:', statusResponse.data);
                setUserStatus(statusResponse.data);
                
                // Fetch global virality momentum (count of cbp_users) from Supabase
                let globalViralityMomentum = 0;
                let pveEarnings = 0;
                let personalReferrals = 0;
                let personalViralityCommunity = 0;
                if (supabase) {
                    const { data, error } = await supabase
                    .from('cbp_users')
                    .select('gvm_index')
                    .not('gvm_index', 'is', null)
                    .order('gvm_index', { ascending: false })
                    .limit(1)
                    .single();
                    
                    if (error) {
                        console.error('❌ [PLAN] Error fetching user count from Supabase:', error);
                    } else {
                        globalViralityMomentum = data.gvm_index || 0;
                        console.log('📡 [PLAN] Global virality momentum (user count):', globalViralityMomentum);
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
                    
                    console.log("userReferralRecord", userReferralRecord) 

                    if(userReferralError){
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
                    console.warn('⚠️ [PLAN] Supabase client not configured');
                }
                
                
                setGlobalStats({
                    totalEarnings: pveEarnings || 0,
                    personalReferrals: personalReferrals || 0,
                    personalViralityCommunity: personalViralityCommunity || 0,
                    globalViralityMomentum: globalViralityMomentum
                });
                
            } catch (error) {
                console.error('❌ [PLAN] Error fetching user status:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserStatus();
    }, [userData]);

    if (loading) {
        return (
            <div className="plan-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading your plan status...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="plan-page">
                <div className="error-container">
                    <p>Error loading plan: {error}</p>
                </div>
            </div>
        );
    }
   
    return (
        <div>
            <div className="plan-page"> 
                <div className="user-greeting">
                    <p>
                        Hi! {userData?.username}<span className="username-dash"> ({userData?.referral_id})</span>
                    </p>
                </div>
                <div className="points-section">
                    <h2>{globalStats.globalViralityMomentum.toLocaleString()}+</h2>
                    <p>Global iEX Buyers</p>
                </div>

                <div className="plan-section">
                    <p className="" style={{ marginBottom: "20px" }}>CBP GLOBAL VIRALITY INDEX </p>
                    <PlanTable 
                        userStatus={userStatus} 
                        globalStats={globalStats}
                        userData={userData}
                    />

                    
                </div>
                <div className="plan-stats-section">
                    <div className="stat-card">
                        <div className="stat-icon woman-icon"></div>
                        <div className="stat-label">My Total Earnings</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>${globalStats.totalEarnings}</span>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon man-icon"></div>
                        <div className="stat-label">My Personal Referrals</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>{globalStats.personalReferrals}</span>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon woman-icon"></div>
                        <div className="stat-label">My Personal Virality Community</div>
                        <div className="stat-value">
                            <div className="star-icon"></div>
                            <span>{globalStats.personalViralityCommunity}</span>
                        </div>
                    </div>
                    <p className="disclaimer-text">
                        Disclaimer - Personal Virality Earnings in Eonx CBP Viral Model is not guaranteed. It fully depends on each user’s effort, performance, and activity. All stated Personal Virality Earnings are gross and do not include any applicable taxes. Taxes, if any, will be applied as per the laws and regulations of your respective country or region.
                    </p>
                </div>



                
                
            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
}