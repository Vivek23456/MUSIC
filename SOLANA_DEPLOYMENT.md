# Solana Smart Contract Deployment Guide

## Prerequisites

1. **Install Rust and Solana CLI**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
solana --version
```

2. **Install Anchor Framework**
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Verify installation
anchor --version
```

## Step 1: Setup Solana Wallet

```bash
# Create a new keypair for deployment
solana-keygen new --outfile ~/.config/solana/devnet-deployer.json

# Set to devnet
solana config set --url https://api.devnet.solana.com

# Get devnet SOL (airdrop)
solana airdrop 2

# Check balance
solana balance
```

## Step 2: Prepare Smart Contract

1. Create a new Anchor project:
```bash
anchor init music_stream_payment
cd music_stream_payment
```

2. Replace `programs/music_stream_payment/src/lib.rs` with the contract from `solana-contract/music_payment.rs`

3. Update `Anchor.toml`:
```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
music_stream_payment = "YOUR_PROGRAM_ID_HERE"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/devnet-deployer.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## Step 3: Build and Deploy

```bash
# Build the program
anchor build

# Get the program ID
solana address -k target/deploy/music_stream_payment-keypair.json

# Update the program ID in lib.rs
# Replace the declare_id! line with your program ID

# Rebuild after updating ID
anchor build

# Deploy to devnet
anchor deploy

# Verify deployment
solana program show YOUR_PROGRAM_ID
```

## Step 4: Initialize Payment Pool

Create a script `scripts/initialize-pool.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MusicStreamPayment } from "../target/types/music_stream_payment";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MusicStreamPayment as Program<MusicStreamPayment>;
  
  const paymentPoolKeypair = anchor.web3.Keypair.generate();
  
  // Initialize with 5% platform fee
  const tx = await program.methods
    .initializePaymentPool(5)
    .accounts({
      paymentPool: paymentPoolKeypair.publicKey,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([paymentPoolKeypair])
    .rpc();

  console.log("Payment pool initialized!");
  console.log("Transaction signature:", tx);
  console.log("Payment pool address:", paymentPoolKeypair.publicKey.toString());
  
  // Save this address - you'll need it for backend integration
}

main();
```

Run it:
```bash
ts-node scripts/initialize-pool.ts
```

## Step 5: Configure Lovable Secrets

Add these secrets to your Lovable project:

1. **SOLANA_PLATFORM_PRIVATE_KEY**: Your platform wallet private key
   - Export from Solana CLI: `cat ~/.config/solana/devnet-deployer.json`
   - Copy the entire JSON array (e.g., `[123,45,67,...]`)

2. **SOLANA_RPC_URL**: Solana RPC endpoint
   - Devnet: `https://api.devnet.solana.com`
   - Mainnet: `https://api.mainnet-beta.solana.com` (or use a paid RPC for better performance)

3. **MUSIC_PAYMENT_PROGRAM_ID**: Your deployed program ID
   - From Step 3 deployment output

4. **PAYMENT_POOL_ADDRESS**: The payment pool address
   - From Step 4 initialization output

## Step 6: Fund the Platform Wallet

```bash
# Airdrop SOL to platform wallet (devnet only)
solana airdrop 5

# For mainnet, you'll need to transfer real SOL
# The platform wallet needs SOL to:
# 1. Pay transaction fees for artist withdrawals
# 2. Hold revenue from ads/subscriptions
```

## Step 7: Test the Integration

1. Create an artist profile in your app
2. Upload and stream some music
3. Run the payment calculation edge function
4. Try withdrawing earnings from the artist dashboard

## Step 8: Monitor and Manage

```bash
# Check program account
solana program show YOUR_PROGRAM_ID

# View payment pool balance
solana balance PAYMENT_POOL_ADDRESS

# Monitor transactions
solana confirm -v TRANSACTION_SIGNATURE
```

## Production Deployment

For mainnet deployment:

1. **Use a Secure RPC Provider**:
   - Alchemy: https://www.alchemy.com/solana
   - QuickNode: https://www.quicknode.com/chains/sol
   - Helius: https://www.helius.dev/

2. **Secure Your Keys**:
   - Use hardware wallets for high-value operations
   - Implement multi-sig for payment pool authority
   - Rotate keys regularly

3. **Optimize Costs**:
   - Batch process payments to reduce transaction fees
   - Monitor gas prices and optimize transaction timing
   - Use priority fees during high network congestion

4. **Set Up Monitoring**:
   - Track program account balance
   - Monitor failed transactions
   - Set up alerts for low balance or errors
   - Use Solana block explorers: https://explorer.solana.com

## Troubleshooting

### Insufficient Funds Error
- Airdrop more devnet SOL: `solana airdrop 2`
- Check balance: `solana balance`

### Program Deployment Failed
- Ensure you have enough SOL for deployment (at least 5 SOL on devnet)
- Check your RPC connection
- Try redeploying: `anchor deploy --provider.cluster devnet`

### Transaction Timeout
- Increase timeout in connection config
- Use a faster RPC endpoint
- Check network status: https://status.solana.com

## Resources

- Solana Documentation: https://docs.solana.com
- Anchor Framework: https://www.anchor-lang.com
- Solana Cookbook: https://solanacookbook.com
- Solana Explorer: https://explorer.solana.com
