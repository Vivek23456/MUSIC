import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Heart, ExternalLink } from "lucide-react";

interface MusicCardProps {
  title: string;
  artist: string;
  price: string;
  image?: string;
  isNFT?: boolean;
}

export const MusicCard = ({ title, artist, price, image, isNFT = true }: MusicCardProps) => {
  return (
    <Card className="glass-card group hover:neon-glow transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="aspect-square w-full music-gradient flex items-center justify-center">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">🎵</div>
          )}
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button className="rounded-full w-16 h-16 music-gradient neon-glow">
            <Play className="h-6 w-6 ml-1" />
          </Button>
        </div>
        
        {isNFT && (
          <Badge className="absolute top-2 right-2 neon-gradient">
            NFT
          </Badge>
        )}
      </div>
      
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          <p className="text-sm text-muted-foreground truncate">{artist}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-neon font-bold">{price} SOL</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Button className="w-full music-gradient neon-glow">
          Buy Now
        </Button>
      </div>
    </Card>
  );
};