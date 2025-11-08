import React, { useEffect, useMemo, useState } from "react";
import "./ShareAndEarn.css";
import MemesCarousel from "../../components/MemesCarousel/MemesCarousel";
import { createClient } from "@supabase/supabase-js";

// CRA envs — same style used in PVC.jsx
const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
  : null;

export default function ShareAndEarn() {
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [telegramUserId, setTelegramUserId] = useState(null);

  // Get Telegram user ID from injected data and fetch ref_code
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErrorMsg("");
      setRefCode("");
      
      // Get Telegram user ID from injected data or use mock data in development
      let tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      // Use mock data in development mode
      if (!tgUserId && (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development")) {
        tgUserId = parseInt(process.env.REACT_APP_DEBUG_TG_ID); // Mock Telegram user ID for development
        console.log("🔍 [TELEGRAM] Using mock Telegram user ID for development:", tgUserId);
      }
      
      if (!tgUserId) {
        if (!cancelled) setErrorMsg("Telegram user ID not found. Please open this page from Telegram.");
        return;
      }
      
      setTelegramUserId(tgUserId);
      
      if (!supabase) { 
        if (!cancelled) setErrorMsg("Supabase client not configured."); 
        return; 
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cbp_users")
          .select("ref_code")
          .eq("telegram_id", tgUserId)
          .maybeSingle();

        if (error) {
          if (!cancelled) setErrorMsg("Failed to load your refer code. Please retry.");
          return;
        }
        const code = data?.ref_code?.trim();
        if (!code) {
          if (!cancelled) setErrorMsg("We couldn't find your refer code in Supabase for this Telegram user.");
          return;
        }
        if (!cancelled) setRefCode(code);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build base share link (?ref=<ref_code>)
  const shareUrl = useMemo(() => {
    if (!refCode) return "";
    // Always build absolute URL to the Share & Earn page
    const u = new URL("/share-and-earn", window.location.origin);
    u.searchParams.set("ref", refCode);
    return u.toString();
  }, [refCode]);

  return (
    <div>
      <div className="share-earn-page">
        {/* Informational Text Section */}
        <div className="info-section">
          <h2 className="info-title">
            Share More and <span className="info-highlight">Earn More</span>
          </h2>
          <p className="info-description">
            Every share link below includes your unique referral code, auto embedded.
            Anyone who buys iEX via your link is added to your Personal Virality Community (PVC) — unlocking higher PVE.
          </p>

          <h3 className="info-subtitle">Free <span className="info-highlight">Referral</span></h3>
          <p className="info-description">
            Users who don't buy immediately are still added to your Free Referrals. When they buy later, they're auto-upgraded to your PVC.
          </p>
        </div>

        {/* Message states */}
        {loading && (
          <p className="info-description" style={{ marginLeft: 12 }}>Loading your refer code…</p>
        )}
        {!loading && !refCode && errorMsg && (
          <p className="info-description" style={{ marginLeft: 12 }}>{errorMsg}</p>
        )}


        {/* Memes carousels with different categories */}
        <div className="memes-wrapper px-3 py-4 d-block d-md-none">
          <MemesCarousel 
            name={"CBP Snapshots"} 
            category="snapshots" 
            walletAddress={null} 
            referralCode={refCode}
            shareMode={true}
          />
        </div>

        <div className="memes-wrapper px-3 py-4 d-block d-md-none">
          <MemesCarousel 
            name={"CBP Gifs"} 
            category="gifts" 
            walletAddress={null} 
            referralCode={refCode}
            shareMode={true}
          />
        </div>

        <div className="memes-wrapper px-3 py-4 d-block d-md-none">
          <MemesCarousel 
            name={"CBP Videos"} 
            category="videos" 
            walletAddress={null} 
            referralCode={refCode}
            shareMode={true}
          />
        </div>

        <h3 className="info-subtitle">
          Share More. Earn More. <span className="info-highlight">Grow</span> Faster.
        </h3>
      </div>

      <div className="bottom-section">
        <img src="/avatar-image-bottom.png" alt="Center Image" className="center-image" />
      </div>
    </div>
  );
}