import React from "react";
import "./ShareModal.css";

/** Make absolute URL for anything in /public */
const abs = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const u = new URL(path.startsWith("/") ? path : `/${path}`, window.location.origin);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1") u.protocol = "http:";
  return u.toString();
};

export default function ShareModal({
  isOpen,
  onClose,
  currentImg,
  refCode = "",
  walletAddress = "",
  connected = false
}) {
  const [isClosing, setIsClosing] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  
  // Simple message with referral code only
  const message = `🚀 Participate in first of it's kind Eonx AI's CBP Viral Model and start your Money Manifestation Journey. Click Now: ${refCode}`;
  const messageTelegram = `🚀 Join me on EonX CBP and start earning!`;
  // Social media sharing URLs (original working approach)
  const socials = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
    telegram: `https://t.me/share/url?url=${refCode}&text=${encodeURIComponent(messageTelegram)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(message)}`,
  };

  // Check if file is a video
  const isVideo = (src) => {
    return src && (src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.ogg'));
  };

  // Get MIME type from file extension
  const getMimeType = (src) => {
    if (!src) return 'image/png';
    if (src.endsWith('.mp4')) return 'video/mp4';
    if (src.endsWith('.webm')) return 'video/webm';
    if (src.endsWith('.ogg')) return 'video/ogg';
    if (src.endsWith('.jpg') || src.endsWith('.jpeg')) return 'image/jpeg';
    if (src.endsWith('.png')) return 'image/png';
    if (src.endsWith('.gif')) return 'image/gif';
    if (src.endsWith('.webp')) return 'image/webp';
    return 'image/png';
  };

  // Get file extension
  const getFileExtension = (src) => {
    if (!src) return '.png';
    const match = src.match(/\.(mp4|webm|ogg|jpg|jpeg|png|gif|webp)$/i);
    return match ? match[0] : '.png';
  };

  const ICONS = {
    whatsapp: abs("/whatsapp.png"),
    telegram: abs("/telegram.png"),
    twitter: abs("/x2.png"),
    facebook: abs("/facebook.png"),
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen || !currentImg) return null;

  // Copy text to clipboard
  const copyText = async () => {
    try { 
      await navigator.clipboard.writeText(message); 
      alert('Text copied to clipboard!');
    } catch {
      alert('Failed to copy text');
    }
  };

  // Native share with media file
  const nativeShare = async () => {
    if (!navigator.share) {
      copyText();
      return;
    }

    try {
      setIsSharing(true);
      
      // Fetch the media file
      const mediaUrl = abs(currentImg);
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      
      // Create a File object from the blob
      const mimeType = getMimeType(currentImg);
      const extension = getFileExtension(currentImg);
      const fileName = `eonx-cbp-meme${extension}`;
      const file = new File([blob], fileName, { type: mimeType });

      // Check if the browser supports sharing files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Join EonX CBP",
          text: message,
          files: [file]
        });
      } else {
        // Fallback to sharing just text if files aren't supported
        await navigator.share({
          title: "Join EonX CBP",
          text: message
        });
      }
    } catch (error) {
      // If sharing was cancelled or failed, copy text instead
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        copyText();
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className={`share-backdrop ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`share-sheet ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="share-title">Share Meme</div>

        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: 16,
          padding: window.innerWidth <= 480 ? "8px" : "12px",
          background: "linear-gradient(135deg, rgba(0,255,0,0.05) 0%, rgba(0,255,0,0.02) 100%)",
          borderRadius: window.innerWidth <= 480 ? "10px" : "12px",
          border: "1px solid rgba(0,255,0,0.2)"
        }}>
          <img 
            src={currentImg} 
            alt="Selected Meme" 
            style={{ 
              maxWidth: "100%", 
              maxHeight: window.innerWidth <= 480 ? "120px" : window.innerWidth <= 768 ? "160px" : "200px", 
              borderRadius: "10px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              border: "2px solid rgba(0,255,0,0.3)"
            }} 
          />
        </div>

        <div className="share-row">
          <button className="share-pill" onClick={copyText} title="Copy Text">
            <span className="share-icon">🔗</span>
            <span>Copy Text</span>
          </button>

          <button 
            className="share-pill" 
            onClick={nativeShare} 
            disabled={isSharing}
            title={isSharing ? "Preparing media..." : "Share Media + Text"}
            style={{ opacity: isSharing ? 0.6 : 1 }}
          >
            <span className="share-icon">{isSharing ? '⏳' : '📤'}</span>
            <span>{isSharing ? 'Loading...' : 'Share Media'}</span>
          </button>

          <a className="share-pill" href={socials.whatsapp} target="_blank" rel="noreferrer" title="WhatsApp">
            <img className="share-icon-img" src={ICONS.whatsapp} alt="WhatsApp" />
            <span>WhatsApp</span>
          </a>

          <a className="share-pill" href={socials.telegram} target="_blank" rel="noreferrer" title="Telegram">
            <img className="share-icon-img" src={ICONS.telegram} alt="Telegram" />
            <span>Telegram</span>
          </a>

          <a className="share-pill" href={socials.twitter} target="_blank" rel="noreferrer" title="Twitter">
            <img className="share-icon-img" src={ICONS.twitter} alt="Twitter" />
            <span>Twitter</span>
          </a>

          <a className="share-pill" href={socials.facebook} target="_blank" rel="noreferrer" title="Facebook">
            <img className="share-icon-img" src={ICONS.facebook} alt="Facebook" />
            <span>Facebook</span>
          </a>
        </div>

        <div className="share-text-preview">
          <label className="share-label">Text to share:</label>
          <textarea
            className="share-text-input"
            readOnly
            rows={3}
            value={message}
          />
          <div style={{
            fontSize: '11px',
            color: '#00ff00',
            marginTop: '8px',
            opacity: 0.8,
            textAlign: 'center'
          }}>
            💡 "Share Media" button sends the {isVideo(currentImg) ? 'video' : 'image'} file + text together
          </div>
        </div>

        <button className="share-close" onClick={handleClose}>Close</button>
      </div>
    </div>
  );
}