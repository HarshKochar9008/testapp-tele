import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BulkBuyInit.css";

export default function BulkBuyInit({ userData, onNext, token }) {
  const navigate = useNavigate();
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [placementOption, setPlacementOption] = useState("horizontal"); // 'horizontal' or 'vertical'
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!passphrase || passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters long");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return;
    }

    if (!placementOption) {
      setError("Please select a placement option");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call API to create batch
      const BACKEND_URL =
        process.env.REACT_APP_BACKEND_URL ||
        "";

      if (!BACKEND_URL) {
        setError("Backend configuration missing");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/bulk-buy/create-batch`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
         },
        body: JSON.stringify({
          passphrase: passphrase,
          layout: placementOption,
          centralized_wallet: "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to create batch");
      }

      // Navigate to funding screen with batch data
      if (onNext) {
        onNext({
          batchId: data.batch_id,
          centralizedAddress: data.centralized_funding_address,
          totalAmount: data.total_amount,
          layout: placementOption,
        });
      } else {
        navigate(`/bulk-buy/fund/${data.batch_id}`, {
          state: {
            batchId: data.batch_id,
            centralizedAddress: data.centralized_funding_address,
            totalAmount: data.total_amount,
            layout: placementOption,
          },
        });
      }
    } catch (err) {
      console.error("Error creating batch:", err);
      setError(err.message || "Failed to create bulk buy batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bulk-buy-page">
      {/* Hero Section */}
      <div className="bulk-buy-hero">
        <div className="bulk-buy-hero-content">
          <h1>
            Buy <span className="bulk-buy-highlight">Code Node</span>
          </h1>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="bulk-buy-form-section">
        {/* Passphrase Input */}
        <div className="bulk-buy-input-group">
          <label className="bulk-buy-label">
            <span className="bulk-buy-label-icon">🔐</span>
            Passphrase (for key encryption)
          </label>
          <p className="bulk-buy-hint">
            Choose a strong passphrase to encrypt your private keys. You'll need this to decrypt keys later.
          </p>
          <div className="bulk-buy-input-wrapper">
            <input
              type={showPassphrase ? "text" : "password"}
              className="bulk-buy-input"
              placeholder="Enter passphrase (min. 8 characters)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              minLength={8}
            />
            <button
              type="button"
              className="bulk-buy-toggle-visibility"
              onClick={() => setShowPassphrase(!showPassphrase)}
            >
              {showPassphrase ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Confirm Passphrase */}
        <div className="bulk-buy-input-group">
          <label className="bulk-buy-label">
            <span className="bulk-buy-label-icon">🔒</span>
            Confirm Passphrase
          </label>
          <div className="bulk-buy-input-wrapper">
            <input
              type={showConfirmPassphrase ? "text" : "password"}
              className="bulk-buy-input"
              placeholder="Confirm your passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
            />
            <button
              type="button"
              className="bulk-buy-toggle-visibility"
              onClick={() => setShowConfirmPassphrase(!showConfirmPassphrase)}
            >
              {showConfirmPassphrase ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Placement Option */}
        <div className="bulk-buy-input-group">
          <label className="bulk-buy-label">
            <span className="bulk-buy-label-icon">📊</span>
            Placement Option
          </label>
          <p className="bulk-buy-hint">
            Choose how sub-accounts will be arranged in the referral structure
          </p>
          
          <div className="bulk-buy-placement-options">
            <label className={`bulk-buy-placement-option ${placementOption === "horizontal" ? "active" : ""}`}>
              <input
                type="radio"
                name="placement"
                value="horizontal"
                checked={placementOption === "horizontal"}
                onChange={(e) => setPlacementOption(e.target.value)}
              />
              <div className="placement-option-content">
                <div className="placement-option-title">Horizontal</div>
                <div className="placement-option-desc">
                  All sub-accounts refer directly to your main account
                </div>
                <div className="placement-option-visual">
                  Main → A₁, A₂, A₃... A₁₀
                </div>
              </div>
            </label>

            <label className={`bulk-buy-placement-option ${placementOption === "vertical" ? "active" : ""}`}>
              <input
                type="radio"
                name="placement"
                value="vertical"
                checked={placementOption === "vertical"}
                onChange={(e) => setPlacementOption(e.target.value)}
              />
              <div className="placement-option-content">
                <div className="placement-option-title">Vertical</div>
                <div className="placement-option-desc">
                  Sub-accounts form a chain: A₁ → A₂ → A₃ → ... → A₁₀
                </div>
                <div className="placement-option-visual">
                  Main → A₁ → A₂ → A₃ → ... → A₁₀
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bulk-buy-error">
            <span className="bulk-buy-error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="bulk-buy-submit-btn"
          onClick={handleSubmit}
          disabled={isSubmitting || !passphrase || !confirmPassphrase}
        >
          {isSubmitting ? "Creating Batch..." : "Proceed"}
        </button>

        {/* Info Box */}
        <div className="bulk-buy-info-box">
          <div className="bulk-buy-info-title">ℹ️ Important Notes:</div>
          <ul className="bulk-buy-info-list">
            <li>You will need to send <strong>300 USDT + 10 USDT(for gas fee)</strong> to a centralized address</li>
            <li>9 sub-accounts will be created and linked to your Telegram ID</li>
            <li>Private keys will be encrypted with your passphrase</li>
            <li>Download and securely store your keys after purchase completes</li>
            <li>Keys are required to claim perks from sub-accounts later</li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        <img
          src="/avatar-image-bottom.png"
          alt="EonX footer art"
          className="center-image"
        />
      </div>
    </div>
  );
}

