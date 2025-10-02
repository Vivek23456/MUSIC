import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { StreamingPlayer } from "@/components/StreamingPlayer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Upload, Headphones, TrendingUp, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-bg.jpg";
const Index = () => {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTracks();
  }, []);
  const fetchTracks = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("tracks").select(`
          *,
          artists (
            artist_name,
            wallet_address
          )
        `).order("created_at", {
        ascending: false
      }).limit(12);
      if (error) throw error;
      if (data) setTracks(data);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoading(false);
    }
  };
  const handlePlayTrack = (track: any) => {
    setCurrentTrack(track);
  };
  const handleNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentTrack(tracks[nextIndex]);
  };
  const handlePrevious = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    setCurrentTrack(tracks[prevIndex]);
  };
  return <div className="min-h-screen pb-32">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${heroImage})`
      }} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="container mx-auto px-6 relative z-10 text-center bg-slate-950">
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold neon-text mb-6">
              Stream Music
              <br />
              <span className="text-3xl"></span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">Let's Play the Music As much as You want</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button size="lg" onClick={() => navigate("/auth")} className="music-gradient neon-glow text-lg px-8 py-6 hover-scale smooth-transition">
                <Music className="w-5 h-5 mr-2" />
                Start Listening
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/artist")} className="text-lg px-8 py-6 hover-scale smooth-transition">
                <Upload className="w-5 h-5 mr-2" />
                Upload Music
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16">
              <div className="glass-card p-6 rounded-xl hover-lift smooth-transition bg-inherit">
                <div className=" ">
                  {tracks.length}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Tracks</div>
              </div>
              <div className="glass-card p-6 rounded-xl hover-lift smooth-transition">
                <div className="text-3xl font-bold neon-text">Free</div>
                <div className="text-sm text-muted-foreground mt-1">Streaming</div>
              </div>
              <div className="glass-card p-6 rounded-xl hover-lift smooth-transition">
                <div className="text-3xl font-bold text-music-accent">100%</div>
                <div className="text-sm text-muted-foreground mt-1">To Artists</div>
              </div>
              <div className="glass-card p-6 rounded-xl hover-lift smooth-transition">
                <div className="text-3xl font-bold text-primary">IPFS</div>
                <div className="text-sm text-muted-foreground mt-1">Decentralized</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tracks */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Latest <span className="neon-text">Tracks</span>
          </h2>
          
          {loading ? <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div> : tracks.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No tracks available yet</p>
              <Button onClick={() => navigate("/artist")} className="mt-4 music-gradient">
                Be the first to upload
              </Button>
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tracks.map(track => <Card key={track.id} className="glass-card p-4 hover-lift smooth-transition cursor-pointer" onClick={() => handlePlayTrack(track)}>
                  <div className="aspect-square rounded-lg music-gradient neon-glow mb-4 flex items-center justify-center relative group">
                    <Music className="w-12 h-12 text-white" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 smooth-transition flex items-center justify-center rounded-lg">
                      <Play className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold truncate mb-1">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artists?.artist_name || "Unknown Artist"}
                  </p>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>{track.stream_count || 0} plays</span>
                    <span>{track.genre || "Music"}</span>
                  </div>
                </Card>)}
            </div>}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            How It <span className="neon-text">Works</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="glass-card p-8 rounded-2xl hover-lift smooth-transition">
              <div className="w-16 h-16 rounded-full music-gradient neon-glow flex items-center justify-center mb-6 mx-auto">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Upload Music</h3>
              <p className="text-muted-foreground">
                Artists upload tracks to IPFS for permanent, decentralized storage. Music is always accessible and owned by creators.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl hover-lift smooth-transition">
              <div className="w-16 h-16 rounded-full neon-gradient neon-glow flex items-center justify-center mb-6 mx-auto">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Stream Free</h3>
              <p className="text-muted-foreground">
                Listen to any track for free. Every stream is recorded on-chain to ensure artists get paid fairly for their work.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl hover-lift smooth-transition">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-music-accent to-primary neon-glow flex items-center justify-center mb-6 mx-auto">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Artists Earn</h3>
              <p className="text-muted-foreground">
                Smart contracts automatically distribute payments to artists based on stream counts. Transparent and instant payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <StreamingPlayer currentTrack={currentTrack} onNext={handleNext} onPrevious={handlePrevious} />
    </div>;
};
export default Index;