
import { useState, useMemo, useRef } from "react";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletMultiButton, WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import SceneCanvas from './components/three/SceneCanvas';
import SpinningCube from './components/three/SpinningCube';

const LIGHTHOUSE_API_KEY = "0b400ae4.53669c8fcc7444d4b8630d8e904f4f9f";
const SOLANA_RPC = "https://api.devnet.solana.com";

// Add your NFT.Storage API key here
// const NFT_STORAGE_API_KEY = "YOUR_NFT_STORAGE_API_KEY";

function App() {
  // Animation state for 3D model
  const [isPlaying, setIsPlaying] = useState(false);
  const [headerSpin, setHeaderSpin] = useState(false);
  const [pulseLevel, setPulseLevel] = useState(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const [artistName, setArtistName] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [royalty, setRoyalty] = useState(0);
  const [status, setStatus] = useState("");
  const [library, setLibrary] = useState([
    {
      title: "Decentralized Anthem",
      artist: "Alice",
      uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
      title: "Web3 Vibes",
      artist: "Bob",
      uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
      title: "Solana Sunrise",
      artist: "Carol",
      uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [uploading, setUploading] = useState(false);
  // Remove ipfsUrl state, not needed for separate UI
  // Remove fileInputRef, not needed
  const streamUrl = currentIndex >= 0 ? library[currentIndex]?.uri : "";

  // Modern UI styles
  const containerStyle = {
    minHeight: "100vh",
    background: "linear-gradient(120deg, #6366f1 0%, #818cf8 50%, #f8fafc 100%)",
    backgroundSize: "200% 200%",
    animation: "bgMove 8s ease-in-out infinite",
    fontFamily: "Inter, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 0,
    width: "100vw"
  };
  const headerStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 2px 12px rgba(99,102,241,0.08)",
    padding: "24px 0 12px 0",
    textAlign: "center" as const,
    marginBottom: 32
  };
  const navStyle = {
    display: "flex",
    justifyContent: "center",
    gap: 32,
    marginBottom: 8
  };
  const cardStyle = {
    background: "rgba(255,255,255,0.98)",
    borderRadius: 20,
    boxShadow: "0 6px 32px rgba(99,102,241,0.10)",
    padding: 32,
    maxWidth: 440,
    width: "100%",
    margin: "0 auto"
  };
  const mobileStyle = `@media (max-width: 600px) {
    .music-card { padding: 12px !important; max-width: 98vw !important; }
    .music-input { font-size: 16px !important; }
    .music-btn { font-size: 16px !important; padding: 10px 0 !important; }
    .music-list { font-size: 15px !important; }
    .music-header { font-size: 22px !important; }
  }
  @keyframes bgMove {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .music-btn {
    transition: background 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }
  .music-btn:active::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 120%;
    height: 120%;
    background: rgba(99,102,241,0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0.1);
    animation: ripple 0.5s linear;
    pointer-events: none;
  }
  @keyframes ripple {
    to { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
  .music-btn:hover {
    background: #4f46e5 !important;
    box-shadow: 0 2px 8px #6366f133;
  }
  .music-list li {
    transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .music-list li:hover {
    background: #e0e7ff !important;
    box-shadow: 0 2px 8px #6366f133;
    transform: scale(1.03) rotate(-2deg);
  }
  .music-list li.selected {
    background: #818cf8 !important;
    color: #fff !important;
    box-shadow: 0 4px 16px #6366f1cc;
    transform: scale(1.05) rotate(2deg);
  }
  .site-3d {
    display: inline-block;
    vertical-align: middle;
    margin-right: 16px;
    transition: transform 0.4s cubic-bezier(.68,-0.55,.27,1.55), filter 0.2s;
    filter: drop-shadow(0 4px 24px #6366f1cc);
    will-change: transform, filter;
    cursor: pointer;
  }
  .site-3d.spin {
    animation: spinAnim 1.2s cubic-bezier(.68,-0.55,.27,1.55) infinite;
  }
  .shake {
    animation: shakeAnim 0.5s infinite linear, floatAnim 2s infinite ease-in-out, glowAnim 1.2s infinite alternate;
  }
  @keyframes spinAnim {
    0% { transform: rotate(0deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1.1); }
  }
  @keyframes shakeAnim {
    0% { transform: rotate(-8deg) scale(1.08); }
    20% { transform: rotate(8deg) scale(1.08); }
    40% { transform: rotate(-8deg) scale(1.08); }
    60% { transform: rotate(8deg) scale(1.08); }
    80% { transform: rotate(-8deg) scale(1.08); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes floatAnim {
    0% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
  }
  @keyframes glowAnim {
    0% { filter: drop-shadow(0 0 24px #818cf8cc); }
    100% { filter: drop-shadow(0 0 48px #6366f1cc); }
  }
  `;

  // Wallet setup
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => SOLANA_RPC, []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  // Upload to Lighthouse
  async function handleMusicUpload() {
    if (!musicTitle || !artistName || !musicFile) {
      setStatus("Please enter all fields and select a file.");
      return;
    }
    setUploading(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", musicFile);
      const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LIGHTHOUSE_API_KEY}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.Hash) {
        const url = `https://gateway.lighthouse.storage/ipfs/${data.Hash}`;
        setLibrary([...library, {
          title: musicTitle,
          artist: artistName,
          uri: url
        }]);
        setCurrentIndex(library.length); // Play the newly added song
        setStatus("Upload successful! Song added to library.");
        setMusicTitle("");
        setMusicFile(null);
        setRoyalty(0);
      } else {
        setStatus("Upload failed. " + (data.error || ""));
      }
    } catch (err: any) {
      setStatus("Upload error: " + (err.message || String(err)));
    }
    setUploading(false);
  }

  return (
    <>
      <style>{mobileStyle}</style>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div style={containerStyle}>
              <div style={headerStyle} className="music-header">
                <span
                  className={`site-3d${isPlaying ? " shake" : ""}${headerSpin ? " spin" : ""}`}
                  onMouseEnter={() => setHeaderSpin(true)}
                  onMouseLeave={() => setHeaderSpin(false)}
                  onClick={() => setHeaderSpin(s => !s)}
                  style={{
                    filter: `drop-shadow(0 4px 24px #6366f1cc) brightness(${pulseLevel})`,
                    transition: 'filter 0.2s',
                  }}
                >
                  <svg width="70" height="70" viewBox="0 0 120 120">
                    <defs>
                      <radialGradient id="grad1" cx="60" cy="60" r="60" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                        <stop offset="60%" stopColor="#818cf8" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
                      </radialGradient>
                      <linearGradient id="grad2" x1="0" y1="0" x2="120" y2="120">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="60" cy="60" rx="50" ry="40" fill="url(#grad1)" />
                    <ellipse cx="60" cy="60" rx="30" ry="24" fill="url(#grad2)" />
                    <circle cx="60" cy="60" r="14" fill="#fff" filter="url(#glow)" />
                    <ellipse cx="60" cy="60" rx="18" ry="8" fill="#6366f1" opacity="0.18" />
                    <rect x="54" y="40" width="12" height="40" rx="6" fill="#fff" opacity="0.7" />
                    <rect x="70" y="50" width="6" height="20" rx="3" fill="#fff" opacity="0.5" />
                    <rect x="44" y="50" width="6" height="20" rx="3" fill="#fff" opacity="0.5" />
                    <ellipse cx="60" cy="80" rx="20" ry="6" fill="#818cf8" opacity="0.3" />
                  </svg>
                </span>
                <h1 style={{ color: "#6366f1", fontWeight: 800, fontSize: 28, margin: 0, display: "inline-block", verticalAlign: "middle" }}>🎵 Decentralized Music Platform</h1>
              </div>
              <div className="music-card" style={cardStyle}>
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ color: "#374151", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Register Artist</h2>
                  <input
                    className="music-input"
                    type="text"
                    placeholder="Artist Name"
                    value={artistName}
                    onChange={e => setArtistName(e.target.value)}
                    style={{ width: "100%", padding: 12, margin: "8px 0 12px 0", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 17 }}
                  />
                  <button
                    className="music-btn"
                    onClick={() => setStatus(`Registering artist: ${artistName}`)}
                    style={{ width: "100%", padding: "12px 0", background: "#818cf8", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: "pointer" }}
                  >Register</button>
                </div>
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ color: "#374151", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Upload Music</h2>
                  <input
                    className="music-input"
                    type="text"
                    placeholder="Music Title"
                    value={musicTitle}
                    onChange={e => setMusicTitle(e.target.value)}
                    style={{ width: "100%", padding: 12, margin: "8px 0", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 17 }}
                  />
                  <input
                    className="music-input"
                    type="number"
                    placeholder="Royalty (basis points)"
                    value={royalty}
                    onChange={e => setRoyalty(Number(e.target.value))}
                    style={{ width: "100%", padding: 12, margin: "8px 0 12px 0", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 17 }}
                  />
              <label
  htmlFor="music-upload"
  className="music-btn"
  style={{
    display: "inline-block",
    width: "100%",
    padding: "12px 0",
    background: "#6f71f1ff",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 16,
    textAlign: "center",
    cursor: uploading ? "not-allowed" : "pointer",
    opacity: uploading ? 0.6 : 1,
    margin: "8px 0",
  }}
>
  🎵 {uploading ? "Uploading..." : musicFile ? musicFile.name : "Choose Music File"}
  <input
    id="music-upload"
    type="file"
    accept="audio/*"
    onChange={e => {
      if (e.target.files && e.target.files.length > 0) {
        setMusicFile(e.target.files[0]);
      } else {
        setMusicFile(null);
      }
    }}
    disabled={uploading}
    style={{ display: "none" }}
  />
</label>

                  <button
                    className="music-btn"
                    onClick={handleMusicUpload}
                    disabled={uploading}
                    style={{ width: "100%", padding: "12px 0", background: uploading ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 16, cursor: uploading ? "not-allowed" : "pointer" }}
                  >{uploading ? "Uploading..." : "Upload"}</button>
                </div>
                 <div style={{ marginBottom: 32 }}>
                  <h2 style={{ color: "#374151", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Music Library</h2>
                  <ul className="music-list" style={{ listStyle: "none", padding: 0 }}>
                    {library.map((song, idx) => (
                      <li
                        key={idx}
                        className={currentIndex === idx ? "selected" : ""}
                        style={{
                          marginBottom: 14,
                          padding: 14,
                          background: currentIndex === idx ? "#818cf8" : "#f3f4f6",
                          color: currentIndex === idx ? "#fff" : undefined,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          boxShadow: "0 2px 8px #6366f133",
                          transition: "background 0.2s, box-shadow 0.2s, transform 0.2s",
                          transform: currentIndex === idx ? "scale(1.05) rotate(2deg)" : undefined
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: currentIndex === idx ? "#fff" : "#6366f1", fontSize: 17 }}>{song.title}</div>
                          <div style={{ fontSize: 15, color: currentIndex === idx ? "#e0e7ff" : "#374151" }}>by {song.artist}</div>
                        </div>
                        <button
                          className="music-btn"
                          onClick={() => {
                            setCurrentIndex(idx);
                            setStatus(`Streaming: ${song.title}`);
                          }}
                          style={{ background: currentIndex === idx ? "#6366f1" : "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
                        >Play</button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: "#f3f4f6", borderRadius: 10, padding: 14, color: "#374151", fontSize: 16, textAlign: "center", marginBottom: 8, fontWeight: 500 }}>
                  <strong>Status:</strong> {status}
                </div>
                {streamUrl && currentIndex >= 0 && (
                  <div style={{ marginTop: 32, textAlign: "center", background: "#eef2ff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px #6366f133", position: "relative" }}>
                    <h3 style={{ color: "#6366f1", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Now Streaming</h3>
                    <div style={{ fontWeight: 700, fontSize: 19, color: "#374151", marginBottom: 4 }}>
                      {library[currentIndex].title} <span style={{ fontWeight: 400, fontSize: 16 }}>by {library[currentIndex].artist}</span>
                    </div>
                    <audio
                      id="audio-player"
                      controls
                      src={streamUrl}
                      style={{ width: "100%", marginTop: 12, borderRadius: 8, background: "#fff" }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onTimeUpdate={e => {
                        const audio = e.target as HTMLAudioElement;
                        setAudioProgress(audio.currentTime / (audio.duration || 1));
                        setPulseLevel(1 + (audio.volume * 0.5) + (audioProgress * 0.5));
                      }}
                      onVolumeChange={e => {
                        const audio = e.target as HTMLAudioElement;
                        setPulseLevel(1 + (audio.volume * 0.5) + (audioProgress * 0.5));
                      }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                    <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
                      <button className="music-btn" onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : library.length - 1)} style={{ background: "#818cf8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>⏮ Prev</button>
                      <button className="music-btn" onClick={() => {
                        const audio = document.getElementById("audio-player") as HTMLAudioElement | null;
                        if (audio) {
                          if (audio.paused) {
                            audio.play();
                          } else {
                            audio.pause();
                          }
                        }
                      }} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>⏯ Play/Pause</button>
                      <button className="music-btn" onClick={() => setCurrentIndex(i => i < library.length - 1 ? i + 1 : 0)} style={{ background: "#818cf8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 16, cursor: "pointer" }}>Next ⏭</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ height: '100vh', width: '100%' }}>
      <SceneCanvas>
        <SpinningCube />
        <MusicVisualizer level={pulseLevel} />
      </SceneCanvas>
    </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>

    </>
  );
}

export default App;
