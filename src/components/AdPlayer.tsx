import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Volume2, VolumeX, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdPlayerProps {
  onAdComplete: () => void;
  onSkipAd?: () => void;
  allowSkip?: boolean;
}

export const AdPlayer = ({ onAdComplete, onSkipAd, allowSkip = false }: AdPlayerProps) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const adRevenue = 0.001; // SOL per ad impression

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    trackAdImpression();

    return () => clearInterval(timer);
  }, []);

  const handleAdComplete = async () => {
    await recordAdRevenue();
    onAdComplete();
  };

  const trackAdImpression = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('ad_impressions').insert({
        ad_type: 'audio',
        revenue_amount: adRevenue,
        listener_id: user?.id || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  };

  const recordAdRevenue = async () => {
    console.log('Ad revenue recorded:', adRevenue, 'SOL');
  };

  const progress = ((30 - timeLeft) / 30) * 100;

  return (
    <Card className="glass-card p-6 border-2 border-neon/30">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center mx-auto">
          <Volume2 className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-bold">Advertisement</h3>
        <p className="text-muted-foreground">
          Supporting artists through ads • {timeLeft}s remaining
        </p>
        
        <Progress value={progress} className="w-full" />
        
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          
          {allowSkip && timeLeft <= 5 && onSkipAd && (
            <Button
              onClick={onSkipAd}
              variant="outline"
              size="sm"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip Ad
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          This ad generates ~${(adRevenue * 180).toFixed(3)} USD for artists
        </div>
      </div>
    </Card>
  );
};
