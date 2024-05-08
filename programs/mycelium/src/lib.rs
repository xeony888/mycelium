use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
        CreateMetadataAccountsV3, Metadata,
        mpl_token_metadata::types::DataV2
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::pda::{find_master_edition_account, find_metadata_account};

declare_id!("5436YrJ1qj5U1t8LLXiby2T9niesEsEMz1yimMAA3Mp7");
const CREATOR: &str = "58V6myLoy5EVJA3U2wPdRDMUXpkwg8Vfw5b6fHqi2mEj";
#[program]
pub mod mycelium {
    use anchor_spl::metadata::mpl_token_metadata::types::{Collection, Creator};

    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.program_authority.to_account_info(),
            },
        );
        mint_to(cpi_context, 1)?;
        // create metadata account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.program_authority.to_account_info(),
                update_authority: ctx.accounts.program_authority.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );
        let data_v2 = DataV2 {
            name: String::from("Spore Collection"),
            symbol: String::from("SPORE"),
            uri: String::from("YOLO"),
            seller_fee_basis_points: 100,
            creators: Some(vec![
                Creator {
                    address: *ctx.program_id,
                    verified: true,
                    share: 0
                },
                Creator {
                    address: CREATOR.parse::<Pubkey>().unwrap(),
                    verified: false,
                    share: 100,
                }
            ]),
            collection: Some(
                Collection {
                    key: ctx.accounts.mint.key(),
                    verified: true,
                }
            ),
            uses: None,
        };
        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.program_authority.to_account_info(),
                mint_authority: ctx.accounts.program_authority.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                metadata: ctx.accounts.metadata_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_master_edition_v3(cpi_context, None)?;
        Ok(())
    }
    pub fn mint_nft(ctx: Context<MintNFT>) -> Result<()> {

        // create mint account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.program_authority.to_account_info(),
            },
        );

        mint_to(cpi_context, 1)?;

        // create metadata account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.program_authority.to_account_info(),
                update_authority: ctx.accounts.program_authority.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        let data_v2 = DataV2 {
            name: String::from("Spore"),
            symbol: String::from("SPORE"),
            uri: String::from("YOLO"),
            seller_fee_basis_points: 100,
            creators: Some(vec![
                Creator {
                    address: *ctx.program_id,
                    verified: true,
                    share: 0
                },
                Creator {
                    address: CREATOR.parse::<Pubkey>().unwrap(),
                    verified: false,
                    share: 100,
                }
            ]),
            collection: Some(
                Collection {
                    key: *ctx.program_id,
                    verified: true,
                }
            ),
            uses: None,
        };

        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;

        //create master edition account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.program_authority.to_account_info(),
                mint_authority: ctx.accounts.program_authority.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                metadata: ctx.accounts.metadata_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_master_edition_v3(cpi_context, None)?;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        seeds = [b"collection"],
        bump,
        payer = user,
        mint::decimals = 0,
        mint::authority = program_authority.key(),
        mint::freeze_authority = program_authority.key(),
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = program_authority,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    /// CHECK - address
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0,
    )]
    pub metadata_account: AccountInfo<'info>, 
    /// CHECK: address
    #[account(
        mut,
        address=find_master_edition_account(&mint.key()).0,
    )]
    pub master_edition_account: AccountInfo<'info>, 
    #[account(
        init,
        payer = user,
        seeds = [b"auth"],
        bump,
        space = 8
    )]
    /// CHECK: authority
    pub program_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}
#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"collection"],
        bump
    )]
    pub collection: Account<'info, Mint>,
    #[account(
        seeds = [b"auth"],
        bump,
    )]
    /// CHECK: auth
    pub program_authority: AccountInfo<'info>,
    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = program_authority.key(),
        mint::freeze_authority = program_authority.key(),
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,
    /// CHECK - address
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0,
    )]
    pub metadata_account: AccountInfo<'info>, 
    /// CHECK: address
    #[account(
        mut,
        address=find_master_edition_account(&mint.key()).0,
    )]
    pub master_edition_account: AccountInfo<'info>, 
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}