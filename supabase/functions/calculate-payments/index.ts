import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get stream data from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: streamData, error: streamError } = await supabase
      .from('streams')
      .select(`
        track_id,
        tracks!inner(artist_id, artists!inner(id, wallet_address, artist_name))
      `)
      .gte('streamed_at', twentyFourHoursAgo)
      .eq('completed', true);

    if (streamError) throw streamError;

    // Aggregate streams per artist
    const artistStreams = new Map<string, { stream_count: number; wallet_address: string }>();
    
    streamData?.forEach((stream: any) => {
      const artistId = stream.tracks.artist_id;
      const walletAddress = stream.tracks.artists.wallet_address;
      
      if (artistStreams.has(artistId)) {
        artistStreams.get(artistId)!.stream_count += 1;
      } else {
        artistStreams.set(artistId, {
          stream_count: 1,
          wallet_address: walletAddress
        });
      }
    });

    // Payment rate: 0.001 SOL per stream (1,000,000 lamports)
    const FREE_TIER_RATE = 0.001;

    const paymentResults = [];
    
    for (const [artistId, data] of artistStreams) {
      const paymentAmount = data.stream_count * FREE_TIER_RATE;
      
      // Update artist earnings and pending withdrawal
      const { error: updateError } = await supabase
        .from('artists')
        .update({ 
          total_streams: supabase.sql`total_streams + ${data.stream_count}`,
          total_earnings: supabase.sql`COALESCE(total_earnings, 0) + ${paymentAmount}`,
          pending_withdrawal: supabase.sql`COALESCE(pending_withdrawal, 0) + ${paymentAmount}`
        })
        .eq('id', artistId);

      if (updateError) {
        console.error('Error updating artist:', updateError);
        continue;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          artist_id: artistId,
          amount: paymentAmount,
          status: 'pending',
          transaction_signature: null
        });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }

      paymentResults.push({
        artist_id: artistId,
        stream_count: data.stream_count,
        payment_amount: paymentAmount,
        wallet: data.wallet_address
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_artists: paymentResults.length,
        total_streams: Array.from(artistStreams.values()).reduce((sum, data) => sum + data.stream_count, 0),
        payments: paymentResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Payment calculation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
