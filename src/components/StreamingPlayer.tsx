import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from "lucide-react";
import { getIPFSUrl, formatDuration } from "@/utils/ipfs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  ipfs_cid: string;
  duration: number;
  artist_id: string;
  artists?: {
    artist_name: string;
    wallet_address: string;
  };
}

interface StreamingPlayerProps {
  currentTrack: Track | null;
  onNext?: () => void;
  onPrevious?: () => void;
}

export const StreamingPlayer = ({
  currentTrack,
  onNext,
  onPrevious,
}: StreamingPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [streamRecorded, setStreamRecorded] = useState(false);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      const audioUrl = getIPFSUrl(currentTrack.ipfs_cid);
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setStreamRecorded(false);
      
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Playback error:", error);
          toast({
            title: "Playback error",
            description: "Failed to play track. Please try again.",
            variant: "destructive",
          });
        });
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setProgress(progress);
      setCurrentTime(audio.currentTime);

      // Record stream when 30 seconds played or 50% completed
      if (!streamRecorded && currentTrack) {
        const shouldRecord =
          audio.currentTime >= 30 || progress >= 50;

        if (shouldRecord) {
          recordStream(currentTrack.id);
          setStreamRecorded(true);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onNext) onNext();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrack, streamRecorded, onNext]);

  const recordStream = async (trackId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("streams").insert({
        track_id: trackId,
        listener_id: user?.id || null,
        duration_listened: Math.floor(audioRef.current?.currentTime || 0),
        completed: false,
      });
    } catch (error) {
      console.error("Failed to record stream:", error);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error("Playback error:", error);
        toast({
          title: "Playback error",
          description: "Failed to play track.",
          variant: "destructive",
        });
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !currentTrack) return;
    const time = (value[0] / 100) * currentTrack.duration;
    audioRef.current.currentTime = time;
    setProgress(value[0]);
  };

  if (!currentTrack) return null;

  return (
    <>
      <audio ref={audioRef} />
      <div className="glass-card border-t border-border/20 px-6 py-5 fixed bottom-0 left-0 right-0 z-40 animate-slide-up backdrop-blur-xl">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
          {/* Current Track */}
          <div className="flex items-center space-x-4 min-w-0 w-1/4">
            <div className="w-14 h-14 rounded-lg music-gradient neon-glow flex items-center justify-center smooth-transition hover-scale cursor-pointer">
              <Play className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate text-foreground hover:text-neon smooth-transition cursor-pointer">
                {currentTrack.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artists?.artist_name || "Unknown Artist"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className="smooth-transition hover:text-neon hover:scale-110"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current text-neon" : ""}`} />
            </Button>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-3 w-1/2">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!onPrevious}
                className="smooth-transition hover:text-neon hover:scale-110"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full music-gradient neon-glow smooth-transition hover-scale"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!onNext}
                className="smooth-transition hover:text-neon hover:scale-110"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center space-x-3 w-full max-w-md">
              <span className="text-xs text-muted-foreground font-mono">
                {formatDuration(Math.floor(currentTime))}
              </span>
              <Progress
                value={progress}
                className="flex-1 h-1.5 smooth-transition cursor-pointer hover:h-2"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  handleSeek([percentage]);
                }}
              />
              <span className="text-xs text-muted-foreground font-mono">
                {formatDuration(currentTrack.duration)}
              </span>
            </div>
          </div>

          {/* Volume & Options */}
          <div className="flex items-center justify-end space-x-3 w-1/4">
            <Button
              variant="ghost"
              size="sm"
              className="smooth-transition hover:text-neon hover:scale-110"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
