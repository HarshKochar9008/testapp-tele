import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./BulkBuyProgress.css";

export default function BulkBuyProgress({ userData, batchData, onComplete, token }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId: batchIdFromParams } = useParams();
  const [batchId, setBatchId] = useState(batchData?.batchId || location.state?.batchId || batchIdFromParams);
  const [batchStatus, setBatchStatus] = useState(batchData?.batchStatus || location.state?.batchStatus || {});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

  // Fetch batch status
  const fetchBatchStatus = async () => {
    if (!batchId || !BACKEND_URL) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/bulk-buy/batch-status`,{
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        setBatchStatus(data);
        setIsLoading(false);

        // If completed, stop polling
        if (data.status === "completed") {
          if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching batch status:", err);
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (batchId) {
      fetchBatchStatus(); // Initial fetch
      const interval = setInterval(fetchBatchStatus, 5000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [batchId]);

  // Calculate progress
  const calculateProgress = () => {
    if (!batchStatus.addresses || batchStatus.addresses.length === 0) return 0;

    const completed = batchStatus.addresses.filter(
      (addr) => addr.status === "completed" || addr.status === "purchased"
    ).length;

    return Math.round((completed / 10) * 100);
  };

  const progress = calculateProgress();
  const completedCount =
    batchStatus.addresses?.filter(
      (addr) => addr.status === "completed" || addr.status === "purchased"
    ).length || 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
      case "purchased":
        return "✅";
      case "processing":
      case "approving":
      case "buying":
      case "transferring":
        return "⏳";
      case "pending":
        return "⏸️";
      case "failed":
      case "error":
        return "❌";
      default:
        return "⏸️";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "purchased":
        return "#00FF00";
      case "processing":
      case "approving":
      case "buying":
      case "transferring":
        return "#FFA500";
      case "pending":
        return "#666";
      case "failed":
      case "error":
        return "#FF0000";
      default:
        return "#666";
    }
  };


  if (!batchId) {
    return (
      <div className="bulk-buy-page">
        <div className="bulk-buy-error-screen">
          <div className="bulk-buy-error-icon">⚠️</div>
          <h2>Missing Batch Information</h2>
          <p>Please go back and start a bulk buy batch first.</p>
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
            Bulk Buy <span className="bulk-buy-highlight">Progress</span>
          </h1>
          <p className="bulk-buy-subtitle">
            Track your batch purchase status
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bulk-buy-progress-section">
        {/* Overall Progress Card */}
        <div className="bulk-buy-progress-card">
          <div className="bulk-buy-progress-header">
            <div className="bulk-buy-progress-title">Overall Progress</div>
            <div className="bulk-buy-progress-status">
              {batchStatus.status || "loading"}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bulk-buy-progress-bar-container">
            <div
              className="bulk-buy-progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="bulk-buy-progress-text">
              {completedCount} / 10 Purchases Complete ({progress}%)
            </div>
          </div>

          {/* Stats */}
          <div className="bulk-buy-progress-stats">
            <div className="bulk-buy-stat-item">
              <div className="bulk-buy-stat-label">Completed</div>
              <div className="bulk-buy-stat-value" style={{ color: "#00FF00" }}>
                {completedCount}
              </div>
            </div>
            <div className="bulk-buy-stat-item">
              <div className="bulk-buy-stat-label">In Progress</div>
              <div className="bulk-buy-stat-value" style={{ color: "#FFA500" }}>
                {batchStatus.addresses?.filter(
                  (addr) =>
                    addr.status === "processing" ||
                    addr.status === "approving" ||
                    addr.status === "buying" ||
                    addr.status === "transferring"
                ).length || 0}
              </div>
            </div>
            <div className="bulk-buy-stat-item">
              <div className="bulk-buy-stat-label">Pending</div>
              <div className="bulk-buy-stat-value" style={{ color: "#666" }}>
                {batchStatus.addresses?.filter(
                  (addr) => addr.status === "pending"
                ).length || 0}
              </div>
            </div>
            <div className="bulk-buy-stat-item">
              <div className="bulk-buy-stat-label">Failed</div>
              <div className="bulk-buy-stat-value" style={{ color: "#FF0000" }}>
                {batchStatus.addresses?.filter(
                  (addr) => addr.status === "failed" || addr.status === "error"
                ).length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Accounts List */}
        <div className="bulk-buy-accounts-list">
          <div className="bulk-buy-accounts-title">Sub-Accounts Status</div>

          {isLoading ? (
            <div className="bulk-buy-loading">Loading status...</div>
          ) : batchStatus.addresses && batchStatus.addresses.length > 0 ? (
            <div className="bulk-buy-accounts-grid">
              {batchStatus.addresses.map((addr, index) => (
                <div key={index} className="bulk-buy-account-card">
                  <div className="bulk-buy-account-header">
                    <div className="bulk-buy-account-number">
                      Sub-Account {index + 1}
                    </div>
                    <div
                      className="bulk-buy-account-status"
                      style={{ color: getStatusColor(addr.status) }}
                    >
                      {getStatusIcon(addr.status)} {addr.status || "pending"}
                    </div>
                  </div>

                  <div className="bulk-buy-account-address">
                    {addr.address
                      ? `${addr.address.slice(0, 6)}...${addr.address.slice(-4)}`
                      : "Generating..."}
                  </div>

                  {addr.buy_tx_hash && (
                    <div className="bulk-buy-account-tx">
                      <a
                        href={`https://bscscan.com/tx/${addr.buy_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bulk-buy-tx-link"
                      >
                        View Buy TX →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bulk-buy-empty">No sub-accounts generated yet</div>
          )}
        </div>

        {/* Completion Actions */}
        {batchStatus.status === "completed" && (
          <div className="bulk-buy-completion-card">
            <div className="bulk-buy-completion-icon">🎉</div>
            <div className="bulk-buy-completion-title">Batch Completed!</div>
            <div className="bulk-buy-completion-message">
              All 10 purchases have been successfully processed.
            </div>
            <div className="bulk-buy-completion-warning">
              ⚠️ <strong>Important:</strong> We have sent the private keys your wallets to your telegram, please safely copy those.
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bulk-buy-actions">
          <button
            className="bulk-buy-refresh-btn"
            onClick={fetchBatchStatus}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "🔄 Refresh Status"}
          </button>
          <button
            className="bulk-buy-back-btn"
            onClick={() => navigate("/bulk-buy")}
          >
            ← Back to Bulk Buy
          </button>
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

