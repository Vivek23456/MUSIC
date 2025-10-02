import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from "lucide-react";
import { useState } from "react";

export const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(33);

  return (
    <div className="glass-card border-t border-border/20 px-6 py-5 fixed bottom-0 left-0 right-0 z-40 animate-slide-up backdrop-blur-xl">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
        {/* Current Track */}
        <div className="flex items-center space-x-4 min-w-0 w-1/4">
          <div className="w-14 h-14 rounded-lg music-gradient neon-glow flex items-center justify-center smooth-transition hover-scale cursor-pointer">
            <Music className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate text-foreground hover:text-neon smooth-transition cursor-pointer">Cosmic Vibes NFT</p>
            <p className="text-sm text-muted-foreground truncate">Artist: 0x7a9b...4c2e</p>
          </div>
          <Button variant="ghost" size="sm" className="smooth-transition hover:text-neon hover:scale-110">
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center space-y-3 w-1/2">
          <div className="flex items-center space-x-6">
            <Button variant="ghost" size="sm" className="smooth-transition hover:text-neon hover:scale-110">
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full music-gradient neon-glow smooth-transition hover-scale"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="sm" className="smooth-transition hover:text-neon hover:scale-110">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center space-x-3 w-full max-w-md">
            <span className="text-xs text-muted-foreground font-mono">2:14</span>
            <Progress value={progress} className="flex-1 h-1.5 smooth-transition cursor-pointer hover:h-2" />
            <span className="text-xs text-muted-foreground font-mono">3:45</span>
          </div>
        </div>

        {/* Volume & Options */}
        <div className="flex items-center justify-end space-x-3 w-1/4">
          <Button variant="ghost" size="sm" className="smooth-transition hover:text-neon hover:scale-110">
            <Volume2 className="h-5 w-5" />
          </Button>
          <Progress value={70} className="w-24 h-1.5 smooth-transition cursor-pointer hover:h-2" />
        </div>
      </div>
    </div>
  );
};

import { Music } from "lucide-react";