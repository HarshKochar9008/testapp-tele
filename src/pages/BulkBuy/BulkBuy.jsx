import React, { useState, useEffect } from "react";
import BulkBuyInit from "./BulkBuyInit";
import BulkBuyFund from "./BulkBuyFund";
import BulkBuyProgress from "./BulkBuyProgress";
import { supabase } from "../../lib/supabaseClient";

/**
 * Main Bulk Buy Component
 * Manages the flow between Init -> Fund -> Progress screens
 */
export default function BulkBuy({ userData, token }) {
  const [currentScreen, setCurrentScreen] = useState("init"); // 'init' | 'fund' | 'progress'
  const [batchData, setBatchData] = useState(null);
  const [checkingExistingBatch, setCheckingExistingBatch] = useState(true);

  const handleInitNext = (data) => {
    setBatchData(data);
    setCurrentScreen("fund");
  };

  const handleFundNext = (data) => {
    setBatchData((prev) => ({ ...prev, ...data }));
    setCurrentScreen("progress");
  };

  const handleProgressComplete = () => {
    // Can navigate or reset here if needed
    setCurrentScreen("init");
    setBatchData(null);
  };

  // Check for existing batch when component mounts
  useEffect(() => {
    const checkExistingBatch = async () => {
      if (!userData?.telegram_id) {
        setCheckingExistingBatch(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("cbp_bulk_batches")
          .select("id, centralized_wallet, centralized_wallet, total_usdt_needed, status")
          .eq("telegram_id", userData.telegram_id)
          .maybeSingle();

        if (error) {
          console.error("Error checking for existing batch:", error);
          setCheckingExistingBatch(false);
          return;
        }

        if (data) {
          // User has an existing batch, redirect to fund screen
          const batchId = data.id;
          const centralizedAddress = data.centralized_wallet || data.centralized_wallet || "";
          const totalAmount = data.total_usdt_needed ? String(data.total_usdt_needed / 10e17) : "310";

          setBatchData({
            batchId: batchId,
            centralizedAddress: centralizedAddress,
            totalAmount: totalAmount,
          });
          setCurrentScreen("fund");
        }
      } catch (err) {
        console.error("Error in checkExistingBatch:", err);
      } finally {
        setCheckingExistingBatch(false);
      }
    };

    checkExistingBatch();
  }, [userData?.telegram_id]);

  // Show loading state while checking for existing batch
  if (checkingExistingBatch) {
    return (
      <div className="bulk-buy-page">
        <div className="bulk-buy-hero">
          <div className="bulk-buy-hero-content">
            <h1>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  switch (currentScreen) {
    case "fund":
      return (
        <BulkBuyFund
          userData={userData}
          token={token}
          batchData={batchData}
          onNext={handleFundNext}
        />
      );
    case "progress":
      return (
        <BulkBuyProgress
          userData={userData}
          token={token}
          batchData={batchData}
          onComplete={handleProgressComplete}
        />
      );
    case "init":
    default:
      return (
        <BulkBuyInit userData={userData} token={token} onNext={handleInitNext} />
      );
  }
}

