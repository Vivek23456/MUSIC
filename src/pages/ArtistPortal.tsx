import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navigation } from "@/components/Navigation";
import { TrackUpload } from "@/components/TrackUpload";
import { PaymentDashboard } from "@/components/PaymentDashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Music, TrendingUp, DollarSign, Users, Edit } from "lucide-react";

const ArtistPortal = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    checkArtistProfile();
  }, [publicKey]);

  const checkArtistProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: artistData, error } = await supabase
        .from("artists")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (artistData) {
        setArtist(artistData);
        setArtistName(artistData.artist_name);
        setBio(artistData.bio || "");
        fetchArtistTracks(artistData.id);
      }
    } catch (error: any) {
      console.error("Error fetching artist profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistTracks = async (artistId: string) => {
    const { data } = await supabase
      .from("tracks")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });

    if (data) setTracks(data);
  };

  const createArtistProfile = async () => {
    if (!publicKey || !artistName) {
      toast({
        title: "Missing information",
        description: "Please connect wallet and enter artist name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.from("artists").insert({
        user_id: user.id,
        wallet_address: publicKey.toString(),
        artist_name: artistName,
        bio: bio || null,
      }).select().single();

      if (error) throw error;

      setArtist(data);
      toast({
        title: "Artist profile created!",
        description: "You can now start uploading tracks.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateArtistProfile = async () => {
    if (!artist) return;

    try {
      const { error } = await supabase
        .from("artists")
        .update({
          artist_name: artistName,
          bio: bio || null,
        })
        .eq("id", artist.id);

      if (error) throw error;

      setArtist({ ...artist, artist_name: artistName, bio });
      setEditing(false);
      toast({
        title: "Profile updated!",
        description: "Your artist profile has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-24">
          <Card className="glass-card p-8 max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full music-gradient neon-glow flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Create Artist Profile</h1>
              <p className="text-muted-foreground">
                Set up your artist profile to start uploading tracks
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Artist Name *
                </label>
                <Input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Enter your artist name"
                  className="glass-card"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="glass-card min-h-[120px]"
                />
              </div>

              <Button
                onClick={createArtistProfile}
                disabled={!publicKey || !artistName}
                className="w-full music-gradient neon-glow"
              >
                Create Profile
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <Navigation />
      
      <div className="container mx-auto px-4 py-24">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Tracks</p>
                <p className="text-2xl font-bold">{tracks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-neon" />
              <div>
                <p className="text-sm text-muted-foreground">Total Streams</p>
                <p className="text-2xl font-bold">{artist.total_streams || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-music-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Earnings (SOL)</p>
                <p className="text-2xl font-bold">{artist.total_earnings || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Listeners</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payment Dashboard */}
        <div className="mb-8">
          <PaymentDashboard artistId={artist.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Artist Profile */}
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Artist Profile</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {editing ? "Cancel" : "Edit"}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Artist Name
                  </label>
                  <Input
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="glass-card"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="glass-card min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={updateArtistProfile}
                  className="w-full music-gradient"
                >
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Artist Name</p>
                  <p className="text-lg font-semibold">{artist.artist_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bio</p>
                  <p className="text-sm">{artist.bio || "No bio yet"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wallet</p>
                  <p className="text-sm font-mono">
                    {artist.wallet_address.slice(0, 8)}...
                    {artist.wallet_address.slice(-8)}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Upload Track */}
          <TrackUpload
            artistId={artist.id}
            onUploadComplete={() => fetchArtistTracks(artist.id)}
          />
        </div>

        {/* My Tracks */}
        <Card className="glass-card p-6 mt-8">
          <h2 className="text-2xl font-bold mb-6">My Tracks</h2>
          {tracks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tracks uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tracks.map((track) => (
                <Card key={track.id} className="glass-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg music-gradient neon-glow flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {track.genre || "No genre"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{track.stream_count || 0} streams</span>
                    <span>{new Date(track.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ArtistPortal;
