# Artist Payment System Implementation

## Overview

This decentralized music platform implements a comprehensive artist payment system using:
- **Lovable Cloud** (Supabase) for off-chain data management
- **Solana blockchain** for transparent payment distribution
- **IPFS** for decentralized music storage
- **Hybrid revenue model** (Ad-supported + Premium subscriptions)

## Payment Model

### Free Tier (Ad-Supported)
- **Artist Earnings**: 0.001 SOL per completed stream (~$0.0002 USD)
- **Platform Fee**: 20%
- **Revenue Source**: Audio advertisements (CPM-based)
- **User Experience**: Free streaming with periodic audio ads

### Premium Tier (Ad-Free)
- **Subscription**: 0.05 SOL/month (~$10 USD)
- **Artist Earnings**: 0.005 SOL per stream (5x higher)
- **Platform Fee**: 15%
- **User Experience**: Ad-free, offline listening, higher quality audio

## Architecture

### Database Schema

#### `artists` Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- wallet_address: TEXT (Solana wallet)
- artist_name: TEXT
- bio: TEXT
- total_streams: BIGINT
- total_earnings: NUMERIC (SOL)
- pending_withdrawal: NUMERIC (SOL)
- verified: BOOLEAN
```

#### `payments` Table
```sql
- id: UUID (primary key)
- artist_id: UUID (references artists)
- amount: NUMERIC (SOL)
- status: TEXT (pending/completed/failed)
- transaction_signature: TEXT (Solana tx hash)
- created_at: TIMESTAMP
- processed_at: TIMESTAMP
```

#### `streams` Table
```sql
- id: UUID (primary key)
- track_id: UUID (references tracks)
- listener_id: UUID (references auth.users)
- streamed_at: TIMESTAMP
- duration_listened: INTEGER
- completed: BOOLEAN
```

#### `ad_impressions` Table
```sql
- id: UUID (primary key)
- ad_type: TEXT
- revenue_amount: NUMERIC (SOL)
- listener_id: UUID
- timestamp: TIMESTAMP
```

### Backend Edge Functions

#### 1. `calculate-payments`
**Purpose**: Calculate artist earnings based on streams

**Runs**: Every 24 hours (automated cron job)

**Process**:
1. Query streams from last 24 hours where `completed = true`
2. Aggregate streams per artist
3. Calculate payment: `streams × 0.001 SOL`
4. Update `artists.pending_withdrawal`
5. Create payment records with status "pending"

**Usage**:
```typescript
// Automatically runs daily, or invoke manually:
const { data } = await supabase.functions.invoke('calculate-payments');
```

#### 2. `withdraw-earnings`
**Purpose**: Process artist withdrawal requests

**Process**:
1. Verify artist identity and wallet address
2. Check pending withdrawal amount > 0
3. Create Solana transaction (or simulate in dev)
4. Update payment record with transaction signature
5. Reset `pending_withdrawal` to 0

**Usage**:
```typescript
const { data } = await supabase.functions.invoke('withdraw-earnings', {
  body: {
    artist_id: 'uuid',
    wallet_address: 'SolanaWalletAddress'
  }
});
```

### Solana Smart Contract

**Location**: `solana-contract/music_payment.rs`

**Key Functions**:

1. **initialize_payment_pool**: Set up payment pool with platform fee
2. **register_artist**: Register artist on-chain
3. **deposit_revenue**: Add funds from ads/subscriptions
4. **process_stream_payment**: Calculate and allocate artist earnings
5. **withdraw_earnings**: Transfer SOL to artist wallet
6. **batch_process_payments**: Process multiple payments efficiently

**Security Features**:
- Overflow protection on all math operations
- Artist verification before withdrawals
- Insufficient funds checks
- Event logging for transparency

**Deployment**:
```bash
# Install Anchor
cargo install --git https://github.com/project-serum/anchor avm --locked
avm install latest
avm use latest

# Build and deploy
cd solana-contract
anchor build
anchor deploy --provider.cluster devnet
```

### Frontend Components

#### 1. **PaymentDashboard** (`src/components/PaymentDashboard.tsx`)

Features:
- Real-time earnings overview (total + pending)
- USD conversion display
- One-click withdrawal button
- Payment history with transaction links
- Status indicators (pending/completed/failed)

Usage:
```tsx
<PaymentDashboard artistId={artist.id} />
```

#### 2. **AdPlayer** (`src/components/AdPlayer.tsx`)

Features:
- 30-second audio ad playback
- Skip button (appears at 25s)
- Revenue tracking per impression
- Mute/unmute controls
- Artist earnings display

Usage:
```tsx
<AdPlayer 
  onAdComplete={() => resumeMusic()} 
  allowSkip={true}
/>
```

## Payment Flow

### Stream Recording
```
User plays track → Track in StreamingPlayer
   ↓
Stream recorded in database (completed=true when >80% played)
   ↓
Stream counted for payment calculation
```

### Payment Calculation (Daily)
```
Edge function: calculate-payments
   ↓
Query completed streams from last 24h
   ↓
Group by artist_id
   ↓
Calculate: streams × 0.001 SOL
   ↓
Update artists.pending_withdrawal
   ↓
Create payment record (status=pending)
```

### Withdrawal Process
```
Artist clicks "Withdraw" button
   ↓
Edge function: withdraw-earnings
   ↓
Verify artist + wallet
   ↓
Create Solana transaction
   ↓
Send SOL to artist wallet
   ↓
Update payment (status=completed, tx_signature)
   ↓
Reset pending_withdrawal to 0
```

## Revenue Sources

### 1. Audio Advertisements
- **Frequency**: Every 3-5 songs for free users
- **Duration**: 30 seconds
- **Revenue**: ~$2 CPM (Cost Per Mille)
- **Distribution**: 80% to artists, 20% platform fee

### 2. Premium Subscriptions
- **Price**: 0.05 SOL/month (~$10 USD)
- **Benefits**: Ad-free, offline, higher quality
- **Revenue Split**: 85% to artists, 15% platform fee

### 3. Direct Funding (Future)
- Community funding pools
- Fan tips/donations
- Exclusive content access

## Testing

### Test Payment Calculation
```sql
-- Insert test streams
INSERT INTO streams (track_id, listener_id, completed, streamed_at)
SELECT 
  'track-uuid',
  'user-uuid',
  true,
  NOW()
FROM generate_series(1, 100);

-- Run payment calculation
SELECT * FROM supabase.functions.invoke('calculate-payments');

-- Check results
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
```

### Test Withdrawal
```typescript
// In browser console
const { data, error } = await supabase.functions.invoke('withdraw-earnings', {
  body: {
    artist_id: 'your-artist-uuid',
    wallet_address: 'your-solana-wallet'
  }
});
console.log(data);
```

## Monitoring & Analytics

### Key Metrics to Track
1. **Total streams processed**
2. **Total SOL distributed**
3. **Average earnings per artist**
4. **Withdrawal success rate**
5. **Ad impression revenue**
6. **Premium subscription count**

### Query Examples

**Top earning artists (last 30 days)**:
```sql
SELECT 
  artist_name,
  total_streams,
  total_earnings,
  pending_withdrawal
FROM artists
ORDER BY total_earnings DESC
LIMIT 10;
```

**Payment processing stats**:
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_sol
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

**Ad revenue tracking**:
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as impressions,
  SUM(revenue_amount) as total_revenue
FROM ad_impressions
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## Security Considerations

### Implemented
✅ Row Level Security (RLS) on all tables
✅ Artist verification before withdrawals
✅ Transaction signature verification
✅ Overflow protection in smart contract
✅ Auth-based access control

### Production Requirements
⚠️ Enable leaked password protection
⚠️ Implement rate limiting on withdrawals
⚠️ Add multi-signature for large withdrawals
⚠️ Regular smart contract audits
⚠️ Fraud detection for fake streams

## Deployment Checklist

- [ ] Deploy Solana smart contract to mainnet
- [ ] Update edge functions with mainnet RPC
- [ ] Configure production Solana wallet
- [ ] Set up automated payment calculation (cron)
- [ ] Enable Supabase auth password protection
- [ ] Implement ad server integration
- [ ] Set up payment monitoring dashboard
- [ ] Configure email notifications for withdrawals
- [ ] Load test payment processing
- [ ] Audit smart contract security

## Future Enhancements

1. **Multi-artist collaboration support**: Split payments between collaborators
2. **Royalty tracking**: Secondary market NFT royalties
3. **Geographic analytics**: Earnings by region
4. **Tax reporting**: Automated 1099 generation
5. **Instant micropayments**: Real-time streaming payments
6. **Token rewards**: Platform token for listeners and artists
7. **NFT integration**: Mint songs as NFTs
8. **Subscription tiers**: Multiple premium levels

## Support

For issues or questions:
- Check console logs in browser DevTools
- Review Supabase function logs
- View Solana transaction on explorer
- Contact: support@musicplatform.com

## License

MIT License - See LICENSE file for details
