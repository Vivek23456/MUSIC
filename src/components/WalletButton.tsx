import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Copy, ExternalLink } from "lucide-react";
import { useState } from 'react';

export const WalletButton = () => {
  const { wallet, publicKey, connected, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-3">
        <Badge className="neon-gradient px-4 py-2 smooth-transition hover-scale shadow-lg">
          <Wallet className="h-4 w-4 mr-2" />
          Connected
        </Badge>
        
        <div className="glass-card px-4 py-2.5 flex items-center space-x-2 hover-scale smooth-transition">
          <span className="text-sm font-mono font-medium">
            {truncateAddress(publicKey.toString())}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAddress}
            className="h-7 w-7 p-0 smooth-transition hover:text-neon hover:scale-110"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, '_blank')}
            className="h-7 w-7 p-0 smooth-transition hover:text-neon hover:scale-110"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={disconnect}
          className="border-destructive text-destructive hover:bg-destructive/10 smooth-transition hover-lift"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="wallet-adapter-button-trigger">
      <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-purple-800 hover:!from-purple-700 hover:!to-purple-900 !rounded-lg !font-semibold !transition-all !duration-300 !shadow-lg hover:!shadow-purple-500/25" />
    </div>
  );
};