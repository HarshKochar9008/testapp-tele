import React, { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import 'swiper/css';
import "./ReelsViewer.css";
import ShareModal from "../ShareModal/ShareModal";

export default function ReelsViewer({ 
  isOpen, 
  onClose, 
  memes = [], 
  initialIndex = 0,
  refCode,
  walletAddress,
  connected 
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showShareModal, setShowShareModal] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState(null);
  
  const videoRefs = useRef({});

  // Check if file is a video
  const isVideo = (src) => {
    return src && (src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg'));
  };

  // Handle video playback for current index
  useEffect(() => {
    if (!isOpen) return;

    // Pause all videos first
    Object.values(videoRefs.current).forEach(video => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });

    // Play current video if it exists
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo && isVideo(memes[currentIndex])) {
      currentVideo.play().catch(err => console.log("Video play error:", err));
    }
  }, [currentIndex, isOpen, memes]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Update Swiper when initial index changes
  useEffect(() => {
    if (isOpen && swiperInstance && initialIndex !== currentIndex) {
      swiperInstance.slideTo(initialIndex, 0);
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex, swiperInstance]);

  const handleSlideChange = (swiper) => {
    setCurrentIndex(swiper.activeIndex);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };

  if (!isOpen) return null;

  const currentMeme = memes[currentIndex];

  return (
    <div className="reels-viewer-overlay">
      {/* Close button */}
      <button className="reels-close-btn" onClick={onClose} aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Progress indicators */}
      <div className="reels-progress-indicators">
        {memes.map((_, idx) => (
          <div 
            key={idx} 
            className={`reels-progress-dot ${idx === currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* Swiper Container */}
      <Swiper
        direction="vertical"
        slidesPerView={1}
        spaceBetween={0}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: true,
        }}
        keyboard={{
          enabled: true,
        }}
        modules={[Mousewheel, Keyboard]}
        onSwiper={setSwiperInstance}
        onSlideChange={handleSlideChange}
        initialSlide={initialIndex}
        className="reels-swiper"
        speed={300}
        touchRatio={1}
        threshold={10}
      >
        {memes.map((meme, index) => (
          <SwiperSlide key={index}>
            <div className="reels-slide-content">
              {isVideo(meme) ? (
                <video
                  ref={(el) => videoRefs.current[index] = el}
                  className="reels-video"
                  src={meme}
                  loop
                  muted
                  playsInline
                  controls={false}
                />
              ) : (
                <img
                  className="reels-image"
                  src={meme}
                  alt={`Meme ${index + 1}`}
                />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Right side controls */}
      <div className="reels-controls">
        <button 
          className="reels-share-btn" 
          onClick={handleShare}
          aria-label="Share"
          title="Share"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span className="reels-btn-label">Share</span>
        </button>
      </div>

      {/* Navigation hints */}
      {currentIndex > 0 && (
        <div className="reels-nav-hint reels-nav-up" onClick={() => swiperInstance?.slidePrev()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14l5-5 5 5z"/>
          </svg>
        </div>
      )}
      {currentIndex < memes.length - 1 && (
        <div className="reels-nav-hint reels-nav-down" onClick={() => swiperInstance?.slideNext()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
      )}

      {/* Counter */}
      <div className="reels-counter">
        {currentIndex + 1} / {memes.length}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={handleCloseShareModal}
        currentImg={currentMeme}
        refCode={refCode}
        walletAddress={walletAddress}
        connected={connected}
      />
    </div>
  );
}

