// Solana Smart Contract for Music Stream Payments
// This contract manages artist payments based on stream counts
// Deploy using Anchor framework

use anchor_lang::prelude::*;

declare_id!("MusicStreamPayment11111111111111111111111");

#[program]
pub mod music_stream_payment {
    use super::*;

    /// Initialize the payment pool with platform settings
    pub fn initialize_payment_pool(
        ctx: Context<InitializePaymentPool>,
        platform_fee_percent: u8,
    ) -> Result<()> {
        require!(platform_fee_percent <= 30, CustomError::InvalidFeePercent);
        
        let payment_pool = &mut ctx.accounts.payment_pool;
        payment_pool.authority = ctx.accounts.authority.key();
        payment_pool.platform_fee_percent = platform_fee_percent;
        payment_pool.total_sol_deposited = 0;
        payment_pool.total_sol_distributed = 0;
        
        msg!("Payment pool initialized with {}% platform fee", platform_fee_percent);
        Ok(())
    }

    /// Register an artist account on-chain
    pub fn register_artist(
        ctx: Context<RegisterArtist>,
        artist_id: String,
    ) -> Result<()> {
        require!(artist_id.len() <= 64, CustomError::ArtistIdTooLong);
        
        let artist_account = &mut ctx.accounts.artist_account;
        artist_account.wallet = ctx.accounts.artist_wallet.key();
        artist_account.artist_id = artist_id.clone();
        artist_account.total_streams = 0;
        artist_account.total_earnings = 0;
        artist_account.pending_withdrawal = 0;
        artist_account.is_verified = false;
        
        msg!("Artist registered: {}", artist_id);
        Ok(())
    }

    /// Deposit revenue into the payment pool (from ads, subscriptions, etc.)
    pub fn deposit_revenue(
        ctx: Context<DepositRevenue>,
        amount: u64,
        revenue_source: RevenueSource,
    ) -> Result<()> {
        let payment_pool = &mut ctx.accounts.payment_pool;
        
        // Transfer SOL to payment pool
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &payment_pool.key(),
            amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                payment_pool.to_account_info(),
            ],
        )?;

        payment_pool.total_sol_deposited = payment_pool
            .total_sol_deposited
            .checked_add(amount)
            .ok_or(CustomError::MathOverflow)?;
        
        emit!(RevenueDeposited {
            amount,
            source: revenue_source,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Revenue deposited: {} lamports", amount);
        Ok(())
    }

    /// Process stream payments for an artist
    pub fn process_stream_payment(
        ctx: Context<ProcessStreamPayment>,
        artist_id: String,
        stream_count: u64,
        payment_rate: u64, // Lamports per stream
    ) -> Result<()> {
        let artist_account = &mut ctx.accounts.artist_account;
        let payment_pool = &mut ctx.accounts.payment_pool;

        // Verify artist
        require!(
            artist_account.artist_id == artist_id,
            CustomError::InvalidArtist
        );

        // Calculate earnings with overflow protection
        let gross_earnings = stream_count
            .checked_mul(payment_rate)
            .ok_or(CustomError::MathOverflow)?;
        
        let platform_fee = gross_earnings
            .checked_mul(payment_pool.platform_fee_percent as u64)
            .and_then(|x| x.checked_div(100))
            .ok_or(CustomError::MathOverflow)?;
        
        let net_earnings = gross_earnings
            .checked_sub(platform_fee)
            .ok_or(CustomError::MathOverflow)?;

        // Update artist account with overflow protection
        artist_account.total_streams = artist_account.total_streams
            .checked_add(stream_count)
            .ok_or(CustomError::MathOverflow)?;
        
        artist_account.total_earnings = artist_account.total_earnings
            .checked_add(net_earnings)
            .ok_or(CustomError::MathOverflow)?;
        
        artist_account.pending_withdrawal = artist_account.pending_withdrawal
            .checked_add(net_earnings)
            .ok_or(CustomError::MathOverflow)?;

        // Update pool stats
        payment_pool.total_sol_distributed = payment_pool.total_sol_distributed
            .checked_add(gross_earnings)
            .ok_or(CustomError::MathOverflow)?;

        emit!(StreamPaymentProcessed {
            artist_id,
            stream_count,
            gross_earnings,
            net_earnings,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Processed payment for artist: {} streams, {} SOL", stream_count, net_earnings as f64 / 1_000_000_000.0);
        Ok(())
    }

    /// Withdraw pending earnings to artist wallet
    pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>) -> Result<()> {
        let artist_account = &mut ctx.accounts.artist_account;
        let payment_pool = &mut ctx.accounts.payment_pool;
        
        let withdrawal_amount = artist_account.pending_withdrawal;
        require!(withdrawal_amount > 0, CustomError::NoFundsToWithdraw);
        
        // Verify signer is the artist
        require!(
            artist_account.wallet == ctx.accounts.artist_wallet.key(),
            CustomError::UnauthorizedWithdrawal
        );
        
        // Check pool has sufficient funds
        require!(
            **payment_pool.to_account_info().lamports.borrow() >= withdrawal_amount,
            CustomError::InsufficientPoolFunds
        );

        // Transfer SOL from pool to artist
        **payment_pool.to_account_info().try_borrow_mut_lamports()? -= withdrawal_amount;
        **ctx.accounts.artist_wallet.to_account_info().try_borrow_mut_lamports()? += withdrawal_amount;

        // Reset pending withdrawal
        artist_account.pending_withdrawal = 0;

        emit!(EarningsWithdrawn {
            artist_wallet: ctx.accounts.artist_wallet.key(),
            amount: withdrawal_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Withdrawal successful: {} SOL", withdrawal_amount as f64 / 1_000_000_000.0);
        Ok(())
    }

    /// Batch process multiple artist payments (gas optimization)
    pub fn batch_process_payments(
        ctx: Context<BatchProcessPayments>,
        payments: Vec<StreamPaymentData>,
    ) -> Result<()> {
        require!(payments.len() <= 50, CustomError::BatchTooLarge);
        
        for payment_data in payments {
            // In production, this would call internal payment logic
            // Simplified here for demonstration
            msg!("Batch processing payment for artist: {}", payment_data.artist_id);
        }
        
        Ok(())
    }
}

// Account Structures

#[derive(Accounts)]
pub struct InitializePaymentPool<'info> {
    #[account(
        init,
        payer = authority,
        space = PaymentPool::SPACE
    )]
    pub payment_pool: Account<'info, PaymentPool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterArtist<'info> {
    #[account(
        init,
        payer = artist_wallet,
        space = ArtistAccount::SPACE,
        seeds = [b"artist", artist_wallet.key().as_ref()],
        bump
    )]
    pub artist_account: Account<'info, ArtistAccount>,
    #[account(mut)]
    pub artist_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositRevenue<'info> {
    #[account(mut)]
    pub payment_pool: Account<'info, PaymentPool>,
    #[account(mut)]
    pub depositor: Signer<'info>,
}

#[derive(Accounts)]
pub struct ProcessStreamPayment<'info> {
    #[account(mut)]
    pub artist_account: Account<'info, ArtistAccount>,
    #[account(mut)]
    pub payment_pool: Account<'info, PaymentPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawEarnings<'info> {
    #[account(mut)]
    pub artist_account: Account<'info, ArtistAccount>,
    #[account(mut)]
    pub payment_pool: Account<'info, PaymentPool>,
    #[account(mut)]
    pub artist_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct BatchProcessPayments<'info> {
    #[account(mut)]
    pub payment_pool: Account<'info, PaymentPool>,
    pub authority: Signer<'info>,
}

// Data Structures

#[account]
pub struct PaymentPool {
    pub authority: Pubkey,
    pub platform_fee_percent: u8,
    pub total_sol_deposited: u64,
    pub total_sol_distributed: u64,
}

impl PaymentPool {
    pub const SPACE: usize = 8 + 32 + 1 + 8 + 8;
}

#[account]
pub struct ArtistAccount {
    pub wallet: Pubkey,
    pub artist_id: String,
    pub total_streams: u64,
    pub total_earnings: u64,
    pub pending_withdrawal: u64,
    pub is_verified: bool,
}

impl ArtistAccount {
    pub const SPACE: usize = 8 + 32 + 64 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StreamPaymentData {
    pub artist_id: String,
    pub stream_count: u64,
    pub payment_rate: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum RevenueSource {
    Ads,
    Subscription,
    DirectFunding,
}

// Events

#[event]
pub struct RevenueDeposited {
    pub amount: u64,
    pub source: RevenueSource,
    pub timestamp: i64,
}

#[event]
pub struct StreamPaymentProcessed {
    pub artist_id: String,
    pub stream_count: u64,
    pub gross_earnings: u64,
    pub net_earnings: u64,
    pub timestamp: i64,
}

#[event]
pub struct EarningsWithdrawn {
    pub artist_wallet: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// Error Codes

#[error_code]
pub enum CustomError {
    #[msg("Invalid artist ID")]
    InvalidArtist,
    #[msg("No funds available for withdrawal")]
    NoFundsToWithdraw,
    #[msg("Insufficient funds in payment pool")]
    InsufficientPoolFunds,
    #[msg("Stream validation failed")]
    InvalidStream,
    #[msg("Unauthorized withdrawal attempt")]
    UnauthorizedWithdrawal,
    #[msg("Platform fee percent must be <= 30")]
    InvalidFeePercent,
    #[msg("Artist ID too long (max 64 characters)")]
    ArtistIdTooLong,
    #[msg("Math operation overflow")]
    MathOverflow,
    #[msg("Batch size too large (max 50)")]
    BatchTooLarge,
}
