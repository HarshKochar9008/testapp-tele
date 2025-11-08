import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MemesCarousel.css";
import { createClient } from "@supabase/supabase-js";
import ReelsViewer from "./ReelsViewer";

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Different meme categories for different contexts (fallback)
const MEME_CATEGORIES = {
  default: [
    "/memes_eonx/20.png",
    "/memes_eonx/21.png", 
    "/memes_eonx/22.png",
    "/memes_eonx/23.png",
    "/memes_eonx/24.png",
    "/memes_eonx/25.png"
  ],
  snapshots: [
    "/memes_eonx/20.png",
    "/memes_eonx/21.png", 
    "/memes_eonx/22.png",
    "/memes_eonx/23.png",
    "/memes_eonx/24.png",
    "/memes_eonx/25.png"
  ],
  gifts: [
    "/memes_eonx/20.png",
    "/memes_eonx/21.png", 
    "/memes_eonx/22.png",
    "/memes_eonx/23.png",
    "/memes_eonx/24.png",
    "/memes_eonx/25.png"
  ],
  videos: [
    "/memes_eonx/20.png",
    "/memes_eonx/21.png", 
    "/memes_eonx/22.png",
    "/memes_eonx/23.png",
    "/memes_eonx/24.png",
    "/memes_eonx/25.png"
  ]
};

const DEFAULT_IMAGES = MEME_CATEGORIES.default;

/* Optional Supabase — only to fetch ref code by wallet if not in URL/localStorage */
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_ANON
    ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } })
    : null;

export default function MemesCarousel({
  name,
  images = DEFAULT_IMAGES,
  category = "default",
  /** (optional) pass walletAddress from wagmi/appkit to avoid heuristics */
  walletAddress: walletAddressProp,
  /** (optional) pass referralCode directly for sharing */
  referralCode: referralCodeProp,
  /** (optional) enable direct sharing mode */
  shareMode = false,
}) {
  const scrollRef = useRef(null);
  const [memeImages, setMemeImages] = useState(images === DEFAULT_IMAGES ? MEME_CATEGORIES[category] || DEFAULT_IMAGES : images);
  const [loading, setLoading] = useState(false);

  const [reelsViewerOpen, setReelsViewerOpen] = useState(false);
  const [selectedMemeIndex, setSelectedMemeIndex] = useState(0);
  const [gateMsg, setGateMsg] = useState("");

  const [address, setAddress]     = useState("");
  const [connected, setConnected] = useState(false);
  const [refCode, setRefCode]     = useState("");

  // Netflix-style carousel state
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4; // Show 4 memes per page to trigger arrows more often
  const totalPages = Math.ceil(memeImages.length / itemsPerPage);
  
  // Video hover state
  const [hoveredVideo, setHoveredVideo] = useState(null);
  
  // Fetch memes from backend first, fallback to local images
  const fetchMemes = async () => {
    if (images !== DEFAULT_IMAGES) return; // Don't fetch if custom images provided
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/memes/public?category=${category}`);
      const result = await response.json();
      
      if (result.ok && result.data && result.data.length > 0) {
        // If we have memes from backend, use them
        const memeUrls = result.data.map(meme => meme.public_url);
        setMemeImages(memeUrls);
        console.log(`Loaded ${memeUrls.length} memes from backend for category: ${category}`);
      } else {
        // If no memes from backend, use hardcoded fallback
        const fallbackImages = MEME_CATEGORIES[category] || DEFAULT_IMAGES;
        setMemeImages(fallbackImages);
        console.log(`No memes found in backend, using ${fallbackImages.length} fallback images for category: ${category}`);
      }
    } catch (error) {
      console.error("Error fetching memes from backend:", error);
      // Fallback to hardcoded memes if API fails
      const fallbackImages = MEME_CATEGORIES[category] || DEFAULT_IMAGES;
      setMemeImages(fallbackImages);
      console.log(`API error, using ${fallbackImages.length} fallback images for category: ${category}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch memes on component mount
  useEffect(() => {
    fetchMemes();
  }, [category, images]);
  
  // Check if file is a video
  const isVideo = (src) => {
    return src && (src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg'));
  };
  
  // Handle video hover
  const handleVideoHover = (src, isHovering) => {
    if (isVideo(src)) {
      setHoveredVideo(isHovering ? src : null);
    }
  };

  // Detect wallet (prop -> ethereum -> localStorage)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (walletAddressProp && /^0x[a-fA-F0-9]{40}$/.test(walletAddressProp)) {
        if (!cancelled) {
          setAddress(walletAddressProp.toLowerCase());
          setConnected(true);
        }
        return;
      }
      try {
        const accts = await window.ethereum?.request?.({ method: "eth_accounts" });
        if (!cancelled && accts && accts[0]) {
          setAddress(String(accts[0]).toLowerCase());
          setConnected(true);
          return;
        }
      } catch {}
    };

    load();
    const onChange = (accts) => {
      const addr = accts && accts[0] ? String(accts[0]).toLowerCase() : "";
      setAddress(addr);
      setConnected(Boolean(addr));
    };
    window.ethereum?.on?.("accountsChanged", onChange);
    return () => window.ethereum?.removeListener?.("accountsChanged", onChange);
  }, [walletAddressProp]);

  // Resolve ref code (prefer prop, then URL, then localStorage, then Supabase)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("cbp_users")
          .select("invite_url")
          .eq("telegram_id", referralCodeProp)
          .maybeSingle();
        if (cancelled) return;
        setRefCode(error ? "" : (data?.invite_url?.trim() || ""));
      } catch { setRefCode(""); }
    })();

    return () => { cancelled = true; };
  }, [address, referralCodeProp]);

  // Gate: require wallet connection only (no registration needed for sharing)
  const canShare = connected;

  const onImgClick = (src, index) => {
    // If in share mode, directly open reels viewer
    if (shareMode) {
      if (!refCode) {
        setGateMsg("No referral code available for sharing.");
        setTimeout(() => setGateMsg(""), 2000);
        return;
      }
      // Calculate actual index in full meme list
      const actualIndex = currentPage * itemsPerPage + index;
      setSelectedMemeIndex(actualIndex);
      setReelsViewerOpen(true);
      return;
    }

    // Only redirect to share and earn page if not already there
    if (window.location.pathname !== "/share-and-earn") {
      window.location.href = "/share-and-earn";
    } else {
      // If already on share and earn page, open the reels viewer
      if (!canShare) {
        setGateMsg("Connect your wallet to share.");
        setTimeout(() => setGateMsg(""), 2000);
        return;
      }
      // Calculate actual index in full meme list
      const actualIndex = currentPage * itemsPerPage + index;
      setSelectedMemeIndex(actualIndex);
      setReelsViewerOpen(true);
    }
  };
  const closeReelsViewer = () => { setReelsViewerOpen(false); };



  // If ?img=... in URL (coming back from a stub), pre-open the reels viewer on that meme
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const img = u.searchParams.get("img");
      if (img) {
        const imgIndex = memeImages.findIndex(m => m === img);
        if (imgIndex !== -1) {
          setSelectedMemeIndex(imgIndex);
          setReelsViewerOpen(true);
        }
      }
    } catch {}
  }, [memeImages]);

  // Calculate which images to show for current page (Netflix-style)
  const imagesToShow = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return memeImages.slice(startIndex, endIndex);
  }, [memeImages, currentPage, itemsPerPage]);

  // Netflix-style navigation
  const scrollLeft = () => {
    const newPage = currentPage > 0 ? currentPage - 1 : totalPages - 1;
    setCurrentPage(newPage);
    
    if (scrollRef.current) {
      const scrollAmount = -300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const newPage = currentPage < totalPages - 1 ? currentPage + 1 : 0;
    setCurrentPage(newPage);
    
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      
      // If we're at the end, scroll back to the beginning
      if (newPage === 0) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
          }
        }, 300);
      }
    }
  };

  return (
    <div className="memes-section">
      <div className="memes-header">
        <h2 className="memes-title">{name ?? "Memes"}</h2>
        <div className="arrow-buttons">
          <button className="arrow-btn" onClick={scrollLeft}>
            <img src="/arrow_left.svg" alt="Left" />
          </button>
          <button className="arrow-btn" onClick={scrollRight}>
            <img src="/arrow_right.svg" alt="Right" />
          </button>
        </div>
      </div>

      {gateMsg && <div className="mc-note">{gateMsg}</div>}

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading memes...</span>
          </div>
          <p className="mt-2">Loading memes...</p>
        </div>
      ) : (
      <div className="carousel-scroll" ref={scrollRef}>
        {imagesToShow.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            className="meme-btn"
            onClick={() => onImgClick(src, idx)}
            onMouseEnter={() => handleVideoHover(src, true)}
            onMouseLeave={() => handleVideoHover(src, false)}
            title={shareMode ? "Share with referral link" : (window.location.pathname === "/share-and-earn" ? "Share" : "Go to Share & Earn")}
          >
            <div className="video-container">
              {isVideo(src) ? (
                <video
                  className="meme-video"
                  src={src}
                  muted
                  loop
                  playsInline
                  autoPlay={hoveredVideo === src}
                  onMouseEnter={(e) => e.target.play()}
                  onMouseLeave={(e) => e.target.pause()}
                />
              ) : (
                <img
                  className="meme-image"
                  src={src}
                  alt="Meme"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
          </button>
        ))}
      </div>
      )}

      <ReelsViewer
        isOpen={reelsViewerOpen}
        onClose={closeReelsViewer}
        memes={memeImages}
        initialIndex={selectedMemeIndex}
        refCode={refCode}
        walletAddress={address}
        connected={connected}
      />
    </div>
  );
}