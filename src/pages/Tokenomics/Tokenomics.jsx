import React from "react";
import { useNavigate } from "react-router-dom";
import "./Tokenomics.css";

export default function Tokenomics({ userData }) {
    const navigate = useNavigate();
    return (
        <div>
            <div className="tokenomics-page">
                <button
                    className="tokenomics-close-button"
                    aria-label="Close and go back"
                    onClick={() => navigate(-1)}
                >
                    ×
                </button>
                {/* First Section: EonX iEX Tokenomics */}
                <div className="tokenomics-section" style={{marginTop:"30px"}}>
                    <h2>EonX iEX Tokenomics</h2>
                    <ul className="tokenomics-list">
                        <li><strong>Soft Cap:</strong> 200 Million iEX Tokens</li>
                        <li><strong>Hard Cap:</strong> 500 Million iEX Tokens (Maximum Supply Limit)</li>
                        <li>Initially, the 200M soft cap supply will be distributed to the EonX community through rewards,  participation, and  engagement initatives.</li>
                        <li>Once the soft cap is fully distributed, the supply will move toward the hard cap phase — but only through  community governance.</li>
                        <li>Only Early Avengers NFT Holders and Knights of Eonverse  NFT Holders will have voting rights to approve the  transition from soft cap to hard cap.</li>
                        <li>This ensures that EonX token expansion remains community-driven, decentralized, and fair.</li>
                    </ul>
                </div>

                {/* Second Section: EonX iEX Offer Price Structure */}
                <div className="price-structure-section">
                    <h2>EonX iEX Offer Price Growth</h2>
                    <img src="/cbp-presentation.svg" alt="Bonus Table" />
                </div>
                {/* User Bonus Table */}
                <div className="user-bonus">
                    <div className="bonus-table">
                        <div className="bonus-header">
                            <div className="bonus-header-cell">USER RANGE</div>
                            <div className="bonus-header-cell">TOKENS WORTH</div>
                        </div>
                        <div className="bonus-row">
                            <div className="bonus-cell">First 10,000 users</div>
                            <div className="bonus-cell">$100 worth of Eonx iEX</div>
                        </div>
                        <div className="bonus-row">
                            <div className="bonus-cell">Next 10,000 users</div>
                            <div className="bonus-cell">$60 worth of Eonx iEX</div>
                        </div>
                        <div className="bonus-row">
                            <div className="bonus-cell">Next 10,000 users</div>
                            <div className="bonus-cell">$50 worth of Eonx iEX</div>
                        </div>
                        <div className="bonus-row">
                            <div className="bonus-cell">All users after this</div>
                            <div className="bonus-cell">$30 worth of Eonx iEX</div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="bottom-section">
                <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
            </div>
        </div>
    );
} 