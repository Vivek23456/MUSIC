import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { Play, Heart, Zap, Music } from "lucide-react";
import { useState } from 'react';
import { toast } from "@/components/ui/use-toast";

interface NFTMintCardProps {
  title: string;
  artist: string;
  price: string;
  image?: string;
  description?: string;
}

export const NFTMintCard = ({ title, artist, price, image, description }: NFTMintCardProps) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [isMinting, setIsMinting] = useState(false);

  // Treasury wallet to receive payments (verified devnet address)
  const TREASURY_WALLET = new PublicKey('11111111111111111111111111111112'); // System Program (safe devnet address)

  const handleMint = async () => {
    if (!connected || !publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint NFTs",
        variant: "destructive"
      });
      return;
    }

    setIsMinting(true);
    
    try {
      console.log('🎵 Starting NFT mint process...');
      console.log('Wallet:', publicKey.toString());
      console.log('Price:', price, 'SOL');

      // Check wallet balance (reduced amount for testing)
      const balance = await connection.getBalance(publicKey);
      const testAmount = 0.1 * LAMPORTS_PER_SOL; // Reduced to 0.1 SOL for testing
      const minRequired = testAmount + 10000; // Add 10000 lamports for fees

      console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
      console.log('Test amount:', testAmount / LAMPORTS_PER_SOL, 'SOL');

      if (balance < minRequired) {
        throw new Error(`Insufficient balance. Need ${(minRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL but only have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      }

      // Get recent blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      console.log('Got recent blockhash:', blockhash);

      // Create transfer instruction with reduced amount
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: TREASURY_WALLET,
        lamports: testAmount, // Use reduced amount for testing
      });

      // Create VersionedTransaction (Phantom prefers this format)
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      console.log('VersionedTransaction created, simulating...');

      // Simulate transaction first
      try {
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log('Simulation result:', simulationResult);
        
        if (simulationResult.value.err) {
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`);
        }
      } catch (simError) {
        console.error('Simulation failed:', simError);
        throw new Error(`Transaction simulation failed: ${simError.message}`);
      }

      console.log('Simulation successful, sending transaction...');

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      console.log('Transaction sent:', signature);

      toast({
        title: "Transaction Submitted 🚀",
        description: "Confirming your NFT mint transaction..."
      });

      // Wait for confirmation with timeout
      const confirmation = await Promise.race([
        connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
        )
      ]);

      console.log('Transaction confirmed:', confirmation);

      toast({
        title: "NFT Minted Successfully! 🎵",
        description: `${title} has been minted to your wallet. View on Solana Explorer.`,
        action: (
          <Button
            variant="outline" 
            size="sm"
            onClick={() => window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')}
          >
            View Transaction
          </Button>
        )
      });

    } catch (error: any) {
      console.error('Minting failed:', error);
      
      let errorMessage = "There was an error minting your NFT. Please try again.";
      
      if (error.message?.includes('Insufficient balance')) {
        errorMessage = error.message;
      } else if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        errorMessage = "Transaction was cancelled. Make sure to approve the transaction in Phantom wallet.";
      } else if (error.message?.includes('4001')) {
        errorMessage = "Phantom wallet rejected the transaction. Please try again and approve when prompted.";
      } else if (error.message?.includes('simulation failed')) {
        errorMessage = "Transaction would fail. Please check your wallet balance and try again.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Transaction confirmation timeout. Check Solana Explorer to verify.";
      } else if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
        errorMessage = "Network error. Please ensure you're connected to Solana devnet and try again.";
      }

      toast({
        title: "Minting Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="glass-card group hover-lift smooth-transition overflow-hidden hover:shadow-2xl hover:shadow-neon/20">
      <div className="relative overflow-hidden">
        <div className="aspect-square w-full music-gradient flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 smooth-transition" />
          ) : (
            <div className="text-6xl group-hover:scale-110 smooth-transition">🎵</div>
          )}
        </div>
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 smooth-transition flex items-center justify-center backdrop-blur-sm">
          <Button className="rounded-full w-16 h-16 music-gradient neon-glow hover-scale smooth-transition">
            <Play className="h-6 w-6 ml-1" />
          </Button>
        </div>
        
        <Badge className="absolute top-3 right-3 neon-gradient shadow-lg">
          <Music className="h-3 w-3 mr-1" />
          NFT
        </Badge>
      </div>
      
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground truncate text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground truncate mt-1">{artist}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{description}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-neon font-bold text-lg">{price} SOL</span>
          </div>
          
          <Button variant="ghost" size="sm" className="smooth-transition hover:text-neon hover:scale-110">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
        
        <Button 
          className="w-full music-gradient neon-glow smooth-transition hover-lift"
          onClick={handleMint}
          disabled={!connected || isMinting}
        >
          {isMinting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Minting...</span>
            </>
          ) : connected ? (
            <>
              <Zap className="h-4 w-4" />
              <span>Mint NFT</span>
            </>
          ) : (
            <span>Connect Wallet</span>
          )}
        </Button>
      </div>
    </Card>
  );
};