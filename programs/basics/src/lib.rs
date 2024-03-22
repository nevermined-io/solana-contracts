#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("6qNqxkRF791FXFeQwqYQLEzAbGiqDULC5SSHVsfRoG89");

#[program]
pub mod anchor {

    use super::*;

    #[error_code]
    pub enum Errors {
        NoMatch,
    }

    pub fn create_test(ctx: Context<CreateService>, cost: u64) -> Result<()> {
        msg!("Creating something");
        *ctx.accounts.new_account = Service {
            owner: ctx.accounts.signer.key(),
            provider: ctx.accounts.signer.key(),
            cost,
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

    pub fn buy_subscription(ctx: Context<BuySubscription>) -> Result<()> {
        if ctx.accounts.sub.consumer != ctx.accounts.signer.key() {
            return err!(Errors::NoMatch);
        };
        ctx.accounts.sub.tokens += 10;
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.consumer_aa.to_account_info().clone(),
            mint: ctx.accounts.mint.to_account_info().clone(),
            to: ctx.accounts.provider_aa.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, ctx.accounts.info.cost, ctx.accounts.mint.decimals)?;
        Ok(())
    }

    // Stuff for token
    pub fn create_token(_ctx: Context<CreateToken>, _token_name: String) -> Result<()> {
        msg!("Create Token");
        Ok(())
    }

    pub fn create_token_account(_ctx: Context<CreateTokenAccount>) -> Result<()> {
        msg!("Create Token Account");
        Ok(())
    }
    pub fn create_associated_token_account(
        _ctx: Context<CreateAssociatedTokenAccount>,
    ) -> Result<()> {
        msg!("Create Associated Token Account");
        Ok(())
    }
    pub fn transfer_token(ctx: Context<TransferToken>, amount: u64) -> Result<()> {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.from.to_account_info().clone(),
            mint: ctx.accounts.mint.to_account_info().clone(),
            to: ctx.accounts.to_ata.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, ctx.accounts.mint.decimals)?;
        msg!("Transfer Token");
        Ok(())
    }
    pub fn transfer_token2(ctx: Context<TransferToken2>, amount: u64) -> Result<()> {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.from.to_account_info().clone(),
            mint: ctx.accounts.mint.to_account_info().clone(),
            to: ctx.accounts.to_ata.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_context, amount, ctx.accounts.mint.decimals)?;
        msg!("Transfer Token");
        Ok(())
    }
    pub fn mint_token(ctx: Context<MintToken>, amount: u64) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info().clone(),
            to: ctx.accounts.receiver.to_account_info().clone(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::mint_to(cpi_context, amount)?;
        msg!("Mint Token");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(token_name: String)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub extra: SystemAccount<'info>,
    #[account(
        init,
        payer = signer,
        mint::decimals = 6,
        mint::authority = signer.key(),
        seeds = [b"token-2022-token", signer.key().as_ref(), token_name.as_bytes(), extra.key().as_ref()],
        bump,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(cost: u64)]
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
pub struct CreateTokenAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        token::mint = mint,
        token::authority = signer,
        payer = signer,
        seeds = [b"token-2022-token-account", signer.key().as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateAssociatedTokenAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        associated_token::mint = mint,
        payer = signer,
        associated_token::authority = signer,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TransferToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,
    pub to: SystemAccount<'info>,
    #[account(
        init,
        associated_token::mint = mint,
        payer = signer,
        associated_token::authority = to
    )]
    pub to_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TransferToken2<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub from: InterfaceAccount<'info, TokenAccount>,
    pub to: SystemAccount<'info>,
    #[account(mut)]
    pub to_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// document
#[account]
#[derive(InitSpace)]
pub struct Service {
    pub owner: Pubkey,
    pub provider: Pubkey,
    pub cost: u64,
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

#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub receiver: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

