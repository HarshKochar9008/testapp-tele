import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Terms2.css";

export default function Terms2({ userData }) {
    const [cbpTermsAccepted, setCbpTermsAccepted] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get the current state of both checkboxes from the Buy page
    const currentTermsAccepted = location.state?.termsAccepted || false;
    const currentCbpTermsAccepted = location.state?.cbpTermsAccepted || false;
    return (
        <div>
            <div className="terms-page">
                <div className="terms-header">
                    <h1><span className="cbp-text">CBP</span> Terms & Conditions</h1>
                </div>

                <div className="terms-content">
                    <div className="terms-section">
                        <h2>Terms and Conditions</h2>
                        <p>Participation in the CBP Viral Model is completely optional. Every EonX iEX buyer keeps full ownership of their tokens and benefits from iEX price rise — whether or not they participate in CBP Viral Model. The program empowers buyers to become CBP Ambassadors and Crypto Influencers, unlocking bigger earnings through the power of Creative Community impact.</p>
                    </div>

                    <div className="terms-section">
                        <h2>Flushing Out Levels:</h2>
                        <ol className="numbered-list">
                            <li>Up to Level 9: If a buyer's PVC is not fulfilled but GVM is fulfilled, they can complete PVC anytime — no flushing out applies.</li>
                            <li>From Level 10 and Above: If GVM is fulfilled but PVC and the 70:15:15 ratio are not met, the ambassador will be flushed out.</li>
                            <li>Re-entry Requirements After Level 9: Ambassadors must surrender Knights of Eonverse NFTs to rejoin CBP, based on their level
                                <ul className="sub-list">
                                    <li>Levels 1-9: No NFT surrender</li>
                                    <li>Levels 10-15: 1 NFT surrender</li>
                                    <li>Levels 16-20: 2 NFTs surrender</li>
                                    <li>Level 21 and above: 5 NFTs surrender</li>
                                </ul>
                            </li>
                        </ol>
                        <p className="additional-note">After flushing out one or more levels, users must surrender the corresponding number of Knights of Eonverse NFTs per the above conditions.</p>
                    </div>

                    <div className="terms-section">
                        <h2>Terms and Conditions for CBP Flow Checks and Personal Virality Earnings (PVE)</h2>
                        <ol className="numbered-list">
                            <li>Monitor Global Virality Momentum (GVM). Track your Head-On Referrals (direct referral buyers).</li>
                            <li>Track your Personal Virality Community (PVC).</li>
                            <li>Maintain Ratio Conditions: - Up to Level 9: 70:30, After Level 9: 70:15:15</li>
                        </ol>
                    </div>

                    {/* CBP Terms Acceptance Section */}
                    <div className="terms-acceptance">
                        <div className="checkbox-container">
                            <input
                                type="checkbox"
                                id="cbp-terms-acceptance"
                                checked={cbpTermsAccepted}
                                onChange={(e) => setCbpTermsAccepted(e.target.checked)}
                            />
                            <label htmlFor="cbp-terms-acceptance">
                                I have read and agree to the CBP Terms & Conditions
                            </label>
                        </div>
                        <button 
                            className="go-back-button"
                            onClick={() => navigate('/buy', { 
                                state: { 
                                    termsAccepted: currentTermsAccepted,
                                    cbpTermsAccepted: true 
                                } 
                            })}
                            disabled={!cbpTermsAccepted}
                        >
                            Go Back to Buy Page
                        </button>
                    </div>
                </div>
            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
} 