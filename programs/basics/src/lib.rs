#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    self, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("HrdSsNtKSXD2m6V8zQzNVELGHjc6T6CCJQc6uaBxfNwU");

#[program]
pub mod anchor {

    use super::*;

    #[error_code]
    pub enum Errors {
        NoMatch,
    }

    pub fn create_test(ctx: Context<CreateService>, price: u64, credits: u64, metadata: [u8; 256]) -> Result<()> {
        msg!("Creating something");
        *ctx.accounts.new_account = Service {
            owner: ctx.accounts.signer.key(),
            provider: ctx.accounts.signer.key(),
            price,
            credits,
            metadata,
        };
        Ok(())
    }

    pub fn create_empty(ctx: Context<CreateEmpty>) -> Result<()> {
        msg!("Creating something");
        if ctx.accounts.info.provider != ctx.accounts.provider.key() {
            return err!(Errors::NoMatch);
        };
        *ctx.accounts.new_account = Subscription {
            consumer: ctx.accounts.signer.key(),
            provider: ctx.accounts.provider.key(),
            info: ctx.accounts.info.key(),
            tokens: 0,
        };
        Ok(())
    }

    pub fn mint_subscription(ctx: Context<MintSubscription>, amount: u64) -> Result<()> {
        if ctx.accounts.sub.provider != ctx.accounts.signer.key() {
            return err!(Errors::NoMatch);
        };
        ctx.accounts.sub.tokens += amount;
        Ok(())
    }

    pub fn burn_subscription(ctx: Context<BurnSubscription>, amount: u64) -> Result<()> {
        if ctx.accounts.sub.provider != ctx.accounts.signer.key() {
            return err!(Errors::NoMatch);
        };
        if ctx.accounts.sub.tokens < amount {
            return err!(Errors::NoMatch);
        };
        ctx.accounts.sub.tokens -= amount;
        Ok(())
    }

    pub fn buy_subscription(ctx: Context<BuySubscription>) -> Result<()> {
        if ctx.accounts.sub.consumer != ctx.accounts.signer.key() {
            return err!(Errors::NoMatch);
        };
        ctx.accounts.sub.tokens += ctx.accounts.info.credits;
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.consumer_aa.to_account_info().clone(),
            mint: ctx.accounts.mint.to_account_info().clone(),
            to: ctx.accounts.provider_aa.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, ctx.accounts.info.price, ctx.accounts.mint.decimals)?;
        Ok(())
    }

}


#[derive(Accounts)]
#[instruction(price: u64)]
#[instruction(credits: u64)]
#[instruction(metadata: [u8; 256])]
pub struct CreateService<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub provider_aa: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        space= 8 + Service::INIT_SPACE,
        payer = signer,
        seeds = [b"test", signer.key().as_ref()],
        bump,
    )]
    pub new_account: Account<'info, Service>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateEmpty<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub info: Account<'info, Service>,
    #[account(mut)]
    pub provider: SystemAccount<'info>,
    #[account(
        init,
        space= 8 + Subscription::INIT_SPACE,
        payer = signer,
        seeds = [b"test", signer.key().as_ref(), info.key().as_ref()],
        bump,
    )]
    pub new_account: Account<'info, Subscription>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct BuySubscription<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub info: Account<'info, Service>,
    #[account(mut)]
    pub sub: Account<'info, Subscription>,
    #[account(mut)]
    pub provider_aa: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub consumer_aa: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct MintSubscription<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub info: Account<'info, Service>,
    #[account(mut)]
    pub sub: Account<'info, Subscription>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct BurnSubscription<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub info: Account<'info, Service>,
    #[account(mut)]
    pub sub: Account<'info, Subscription>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}



// document
#[account]
#[derive(InitSpace)]
pub struct Service {
    pub owner: Pubkey,
    pub provider: Pubkey,
    pub price: u64,
    pub credits: u64,
    pub metadata: [u8; 256],
}

// account for consumer (agreement)
#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub provider: Pubkey,
    pub consumer: Pubkey,
    pub info: Pubkey,
    pub tokens: u64,
}
