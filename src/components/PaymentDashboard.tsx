import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  Wallet,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  status: string;
  transaction_signature: string | null;
  created_at: string;
  processed_at: string | null;
}

interface PaymentDashboardProps {
  artistId: string;
}

export const PaymentDashboard = ({ artistId }: PaymentDashboardProps) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (artistId) {
      fetchPaymentData();
    }
  }, [artistId]);

  const fetchPaymentData = async () => {
    try {
      // Fetch artist data
      const { data: artistData } = await supabase
        .from('artists')
        .select('total_earnings, pending_withdrawal')
        .eq('id', artistId)
        .single();

      if (artistData) {
        setTotalEarnings(Number(artistData.total_earnings) || 0);
        setPendingEarnings(Number(artistData.pending_withdrawal) || 0);
      }

      // Fetch payment history
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentData) {
        setPayments(paymentData);
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    }
  };

  const withdrawEarnings = async () => {
    if (!publicKey || pendingEarnings <= 0) return;

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('withdraw-earnings', {
        body: { 
          artist_id: artistId,
          wallet_address: publicKey.toString()
        }
      });

      if (error) throw error;

      toast({
        title: "Withdrawal Successful",
        description: `${pendingEarnings.toFixed(4)} SOL withdrawn to your wallet`,
      });

      fetchPaymentData();

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Earnings Overview */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-neon" />
          Earnings Overview
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Earned</span>
            <span className="text-2xl font-bold text-neon">
              {totalEarnings.toFixed(4)} SOL
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Pending Withdrawal</span>
            <span className="text-xl font-semibold text-yellow-500">
              {pendingEarnings.toFixed(4)} SOL
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">USD Equivalent</span>
            <span className="font-mono">
              ~${((totalEarnings + pendingEarnings) * 180).toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          onClick={withdrawEarnings}
          disabled={pendingEarnings <= 0 || withdrawing || !publicKey}
          className="w-full mt-6 music-gradient neon-glow"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {withdrawing ? "Processing..." : `Withdraw ${pendingEarnings.toFixed(4)} SOL`}
        </Button>

        {!publicKey && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Connect your wallet to withdraw earnings
          </p>
        )}
      </Card>

      {/* Payment History */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Recent Payments
        </h3>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No payments yet</p>
              <p className="text-xs">Earnings will appear here after streams</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg glass-card"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <p className="font-semibold">
                      {Number(payment.amount).toFixed(4)} SOL
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(payment.status)}
                  {payment.transaction_signature && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(
                        `https://explorer.solana.com/tx/${payment.transaction_signature}?cluster=devnet`,
                        '_blank'
                      )}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
