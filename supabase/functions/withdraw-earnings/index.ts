import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist_id, wallet_address } = await req.json();

    if (!artist_id || !wallet_address) {
      throw new Error('Missing required fields: artist_id and wallet_address');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get artist's pending withdrawal amount
    const { data: artistData, error: artistError } = await supabase
      .from('artists')
      .select('pending_withdrawal, wallet_address')
      .eq('id', artist_id)
      .single();

    if (artistError) throw artistError;
    if (!artistData) throw new Error('Artist not found');

    const withdrawalAmount = artistData.pending_withdrawal || 0;

    if (withdrawalAmount <= 0) {
      throw new Error('No funds available for withdrawal');
    }

    // Verify wallet address matches
    if (artistData.wallet_address !== wallet_address) {
      throw new Error('Wallet address does not match artist account');
    }

    // ============================================
    // REAL SOLANA TRANSACTION IMPLEMENTATION
    // ============================================
    
    console.log(`Processing withdrawal: ${withdrawalAmount} lamports to ${wallet_address}`);
    
    // Get Solana configuration from environment
    const solanaRpcUrl = Deno.env.get('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    const platformPrivateKey = Deno.env.get('SOLANA_PLATFORM_PRIVATE_KEY');
    
    if (!platformPrivateKey) {
      throw new Error('SOLANA_PLATFORM_PRIVATE_KEY not configured');
    }

    // Initialize Solana connection
    const connection = new Connection(solanaRpcUrl, 'confirmed');
    
    // Decode platform wallet keypair from base58 or JSON
    let platformWallet: Keypair;
    try {
      // Try parsing as JSON array first (standard Solana keypair format)
      const secretKey = JSON.parse(platformPrivateKey);
      platformWallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch {
      // If that fails, try base58 decoding
      const bs58 = await import("npm:bs58@5.0.0");
      const secretKey = bs58.default.decode(platformPrivateKey);
      platformWallet = Keypair.fromSecretKey(secretKey);
    }

    // Create recipient public key
    const recipientPublicKey = new PublicKey(wallet_address);
    
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    
    // Build transaction
    const transaction = new Transaction({
      feePayer: platformWallet.publicKey,
      blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
    }).add(
      SystemProgram.transfer({
        fromPubkey: platformWallet.publicKey,
        toPubkey: recipientPublicKey,
        lamports: Math.floor(withdrawalAmount), // Convert to integer lamports
      })
    );
    
    // Sign and send transaction
    transaction.sign(platformWallet);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    console.log(`Transaction successful: ${signature}`);
    console.log(`Sent ${withdrawalAmount / LAMPORTS_PER_SOL} SOL to ${wallet_address}`);

    // ============================================
    // DATABASE UPDATE
    // ============================================

    // Create payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        artist_id: artist_id,
        amount: withdrawalAmount,
        status: 'completed',
        transaction_signature: signature,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Reset pending withdrawal to 0
    const { error: updateError } = await supabase
      .from('artists')
      .update({ pending_withdrawal: 0 })
      .eq('id', artist_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        amount: withdrawalAmount,
        amount_sol: withdrawalAmount / LAMPORTS_PER_SOL,
        transaction_signature: signature,
        payment_id: paymentData.id,
        explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Withdrawal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
