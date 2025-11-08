import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./BulkBuyFund.css";

export default function BulkBuyFund({ userData, batchData, onNext, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId: batchIdFromParams } = useParams();
  const [batchId, setBatchId] = useState(batchData?.batchId || location.state?.batchId || batchIdFromParams);
  const [centralizedAddress, setCentralizedAddress] = useState(
    batchData?.centralizedAddress || location.state?.centralizedAddress
  );
  const [totalAmount, setTotalAmount] = useState(
    batchData?.totalAmount || location.state?.totalAmount || "300"
  );
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // Generate QR code URL (using a QR code service)
  const qrCodeUrl = centralizedAddress
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(centralizedAddress)}`
    : "";

  const copyAddress = async () => {
    if (centralizedAddress) {
      try {
        await navigator.clipboard.writeText(centralizedAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleCheckStatus = async () => {
    if (!batchId) return;

    setCheckingStatus(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

      if (!BACKEND_URL) {
        alert("Backend configuration missing");
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/bulk-buy/batch-status`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.status === "funded" || data.status === "processing" || data.status === "completed") {
        // Navigate to progress screen
        if (onNext) {
          onNext({ batchId, batchStatus: data });
        } else {
          navigate(`/bulk-buy/progress/${batchId}`, {
            state: { batchId, batchStatus: data },
          });
        }
      } else {
        alert("Payment not yet detected. Please wait a few moments and try again.");
      }
    } catch (err) {
      console.error("Error checking status:", err);
      alert("Failed to check status. Please try again.");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Load batch details from backend if only batchId in URL
  useEffect(() => {
    const fetchBatch = async () => {
      if (!batchId || centralizedAddress) return;
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
      if (!BACKEND_URL) return;
      try {
        setLoadingBatch(true);
        const resp = await fetch(`${BACKEND_URL}/api/bulk-buy/batch-status`,{
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await resp.json();
        if (resp.ok && data.ok) {
          setCentralizedAddress(data.centralized_wallet || data.centralized_funding_address || "");
          // Prefer human readable if provided; fallback to 300
          const amount = data.total_amount / 10e18;
          setTotalAmount(typeof amount === "string" ? amount : String(amount || "310"));
        }
      } catch (e) {
        console.error("Failed to load batch:", e);
      } finally {
        setLoadingBatch(false);
      }
    };
    fetchBatch();
  }, [batchId, centralizedAddress]);

  if (!centralizedAddress && !loadingBatch) {
    return (
      <div className="bulk-buy-page">
        <div className="bulk-buy-error-screen">
          <div className="bulk-buy-error-icon">⚠️</div>
          <h2>Missing Batch Information</h2>
          <p>Please go back and create a batch first.</p>
          <button
            className="bulk-buy-back-btn"
            onClick={() => navigate("/bulk-buy")}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-buy-page">
      {/* Hero Section */}
      <div className="bulk-buy-hero">
        <div className="bulk-buy-hero-content">
          <h1>
            Fund <span className="bulk-buy-highlight">Code Node</span>
          </h1>
          <p className="bulk-buy-subtitle">Send USDT to the address below</p>
        </div>
      </div>

      {/* Funding Section */}
      <div className="bulk-buy-fund-section">
        {/* Amount Info */}
        <div className="bulk-buy-amount-card">
          <div className="bulk-buy-amount-icon">💰</div>
          <div className="bulk-buy-amount-content">
            <div className="bulk-buy-amount-label">Total Amount Required</div>
            <div className="bulk-buy-amount-value">
              {totalAmount} USDT
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="bulk-buy-qr-section">
          <div className="bulk-buy-qr-label">Scan QR Code or Copy Address</div>
          <div className="bulk-buy-qr-container">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="bulk-buy-qr-code"
              />
            ) : (
              <div className="bulk-buy-qr-placeholder">Loading QR Code...</div>
            )}
          </div>
        </div>

        {/* Address Display */}
        <div className="bulk-buy-address-section">
          <div className="bulk-buy-address-label">Centralized Wallet Address</div>
          <div className="bulk-buy-address-wrapper">
            <div className="bulk-buy-address-text">{centralizedAddress}</div>
            <button
              className="bulk-buy-copy-btn"
              onClick={copyAddress}
              title="Copy address"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bulk-buy-instructions">
          <div className="bulk-buy-instructions-title">📋 Instructions:</div>
          <ol className="bulk-buy-instructions-list">
            <li>Send exactly <strong>{totalAmount} USDT</strong> to the address above</li>
            <li>Make sure you're sending on <strong>BSC (Binance Smart Chain)</strong></li>
            <li>Include enough BNB for gas fees</li>
            <li>Once sent, click "Check Payment Status" below</li>
            <li>The system will automatically process all 10 purchases</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="bulk-buy-actions">
          <button
            className="bulk-buy-check-btn"
            onClick={handleCheckStatus}
            disabled={checkingStatus}
          >
            {checkingStatus ? "Checking..." : "Check Payment Status"}
          </button>
          <button
            className="bulk-buy-back-btn"
            onClick={() => navigate("/bulk-buy")}
          >
            ← Back
          </button>
        </div>

        {/* Info Box */}
        <div className="bulk-buy-info-box">
          <div className="bulk-buy-info-title">ℹ️ Important:</div>
          <ul className="bulk-buy-info-list">
            <li>Payment detection may take a few minutes</li>
            <li>Do not close this page until payment is confirmed</li>
            <li>Once confirmed, you'll be redirected to the progress screen</li>
            <li>All purchases will be processed automatically</li>
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

