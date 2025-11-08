import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Terms.css";

export default function Terms({ userData }) {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get the current state of terms checkbox from the Buy page
    const currentTermsAccepted = location.state?.termsAccepted || false;
    return (
        <div>
            <div className="terms-page">
                <div className="terms-header">
                    <h1>General Terms & Conditions</h1>
                </div>

                <div className="terms-content">
                    <div className="terms-section">
                        <div className="terms-intro">
                            <p>Read and accept the Terms and Conditions to buy iEX and participate in the CBP Viral Model.
                                Effective as of 20th September 2025. These Terms and Conditions ("Terms") govern the purchase of iEX and participation in the EonX CBP: The Viral Model (hereafter "EonX CBP" or “CBP”), and the acquisition of EonX iEX Smart Tokens by users. By participating in the EonX iEX Smart Token offering, you (“User,” “Buyer,” or “Participant”) agree to the following:
                            </p>
                        </div>
                    </div>

                    <div className="terms-section">
                        <h2>1. Eligibility</h2>
                        <p>Participants must be at least 13 years old or the legal age of majority in their jurisdiction. Users from jurisdictions where token sales are prohibited (e.g., OFAC-sanctioned countries) are not eligible to participate.</p>

                        <p>Valid Telegram ID is required for participation. EonX reserves the right to request further verification if deemed necessary</p>
                    </div>

                    <div className="terms-section">
                        <h2>2. Purchase Limits & Token Allotment</h2>
                        <p>
                            Each user may purchase a maximum of $30 worth of iEX tokens during the EonX CBP phase. Token prices increase with each milestone as defined in the public tokenomics schedule.
                        </p>
                        <p>
                            Token allocation per user is strictly capped to prevent accumulation, speculation, or artificial price manipulation.
                        </p>
                    </div>


                    <div className="terms-section">
                        <h2>3. Token Utility & Use</h2>
                        <p>iEX tokens are designed for utility within the EonX ecosystem and do not represent equity, debt, or financial security.</p>
                        <p>Participation does not grant any ownership rights, voting power (unless otherwise stated), or claims on company profits unless specified under governance utility. iEX tokens can be upgraded or swapped to mainnet tokens in the future based on wallet snapshot eligibility.</p>
                    </div>

                    <div className="terms-section">
                        <h2>4. Token Distribution, Pricing & CBP Participation</h2>
                        <p>Participation in the CBP Viral Model (including sharing, virality rewards, NFT puzzles, and related activities) is entirely optional. Buyers of iEX tokens maintain full ownership of their tokens regardless of CBP engagement and benefit from any token appreciation or utility in the EonX ecosystem.</p>
                        <p>iEX tokens are distributed through a tiered pricing structure as outlined in the public tokenomics schedule, with early buyers receiving better pricing. Token prices increase at each milestone to promote fair distribution and reduce manipulation.</p>
                        <p>Rewards within the CBP model are strictly performance-based, contingent upon a user’s completion of Personal Virality Score (PVC) requirements and the achievement of Global Virality Momentum (GVM), in alignment with the Global Virality Index.</p>
                    </div>

                    <div className="terms-section">
                        <h2>5. NFT and Partner Status</h2>
                        <p>Users can still mint "Knights of Eonverse NFTs" using “Share” task points in Phase 1 Mini App, through BUMP (Blockchain User Model of Partnership).</p>
                        <p>Holding 10 Knights NFTs entitles users to partner-level status in the EonX AI Multi-Agent Blockchain and may unlock additional governance and financial privileges in future phases.</p>
                    </div>

                    <div className="terms-section">
                        <h2>6. Refund & Risk Policy</h2>
                        <p>All NFT and token purchases are final. EonX does not offer refunds or buybacks.</p>
                        <p>The value of tokens or NFTs is not guaranteed and may fluctuate based on market conditions, community adoption, and utility. Buyers understand and accept the inherent risk involved in blockchain-based token participation.</p>
                    </div>

                    <div className="terms-section">
                        <h2>7. Program Governance & Changes</h2>
                        <p>
                            EonX reserves the right to modify token caps, reward systems, or CBP structures to maintain fairness, prevent abuse, or adapt to regulatory requirements.
                        </p>
                        <p>
                            All changes will be announced publicly through official EonX communication channels.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>8. Restricted Activities</h2>
                        <p>
                            Multi-accounting, referral fraud, bot-generated traffic, or any manipulation of share tasks or CBP mechanics is strictly prohibited.
                        </p>
                        <p>
                            EonX reserves the right to revoke tokens, NFTs, or CBP access for users found violating the rules.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>9. Jurisdiction & Dispute Resolution</h2>
                        <p>
                            These Terms shall be governed by the laws of Panama.
                        </p>
                        <p>
                            Any disputes shall be resolved via arbitration or mediation before seeking court action, unless otherwise required by law.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>10. Disclaimer</h2>
                        <p>
                            EonX makes no promises regarding future token value, listing on exchanges, or earning guarantees.
                        </p>
                        <p>
                            CBP rewards, NFT utilities, and performance bonuses are dependent on user activity and evolving project milestones.
                        </p>
                    </div>

                    <div className="terms-section">
                        <h2>11. Acknowledgement</h2>
                        <p>
                            By purchasing EonX iEX tokens or participating in any CBP program activity, you acknowledge and agree that: You are aware of the risks involved in crypto token participation.
                        </p>
                        <p>
                            You are not relying on any future financial return or promise of appreciation.
                        </p>
                        <p>
                            You have read, understood, and agreed to these Terms in full.
                        </p>
                    </div>

                    {/* Terms Acceptance Section */}
                    <div className="terms-acceptance">
                        <div className="checkbox-container">
                            <input
                                type="checkbox"
                                id="terms-acceptance"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <label htmlFor="terms-acceptance">
                                I have read and agree to the General Terms & Conditions
                            </label>
                        </div>
                        <button 
                            className="go-back-button"
                            onClick={() => navigate('/buy', { 
                                state: { 
                                    termsAccepted: true
                                } 
                            })}
                            disabled={!termsAccepted}
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