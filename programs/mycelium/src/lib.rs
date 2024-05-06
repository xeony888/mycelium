use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{transfer, Mint, Token, TokenAccount, Transfer}};

declare_id!("BPif4ai1prLdd5oJXiMbG1s5Mhgu3g8yUYPURUdYBQ7C");

#[program]
pub mod mycelium {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        Ok(())
    }
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        Ok(())
    }
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        Ok(())
    }
    pub fn mint(ctx: Context<Mint>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        seeds = [b"token"],
        bump,
        token::mint = mint,
        token::authority = program_token_account
    )]
    pub program_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = user,
        seeds = [b"auth"],
        bump
    )]
    pub program_authority: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
pub struct StakeInfo {
    pub stake_times: Vec<u64>
}
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeInfo>,
    #[account(
        init,
        payer = user,
        seeds = [b"stake_token", user.key().as_ref(), mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = program_authority,
    )]
    pub stake_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = nft_account.owner == user.key(),
        constraint = nft_account.amount == 1
    )]
    pub nft_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"auth"],
        bump
    )]
    pub program_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>
}
#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeInfo>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>
    pub system_program: Program<'info, System>
}
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        seeds = [b"stake", user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeInfo>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>
}
#[derive(Accounts)]
pub struct Mint<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

}
