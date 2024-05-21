import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mycelium } from "../target/types/mycelium";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createAssociatedTokenAccount, createMint, getAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import {
    findMasterEditionPda,
    findMetadataPda,
    mplTokenMetadata,
    MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { PublicKey } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("mycelium", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Mycelium as Program<Mycelium>;
    const wallet = provider.wallet as anchor.Wallet;

    const umi = createUmi("https://api.devnet.solana.com")
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

    const [programAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("auth")],
      program.programId,
    )
    const [bank] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      program.programId,
    )
    let mint: PublicKey = new PublicKey("BFG1W788HxXDpbfDHRVcpDKDtmgcAPKxihsi2EzMideQ");
    const mintNft = async () => {
      const mint = anchor.web3.Keypair.generate();

      // Derive the associated token address account for the mint
      const associatedTokenAccount = getAssociatedTokenAddressSync(
          mint.publicKey,
          wallet.publicKey
      );
      let metadataAccount = findMetadataPda(umi, {
        mint: publicKey(mint.publicKey),
    })[0];
    //derive the master edition pda
    let masterEditionAccount = findMasterEditionPda(umi, {
        mint: publicKey(mint.publicKey),
    })[0];
        const tx2 = await program.methods
          .mintNft()
          .accounts({
                signer: wallet.publicKey,
                mint: mint.publicKey,
                associatedTokenAccount,
                programAuthority,
                metadataAccount,
                masterEditionAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([mint])
          .rpc();
        return {mint, associatedTokenAccount, metadataAccount};
    }
    console.log("here");
    const setupToken = async () => {
      const m = await createMint(
        provider.connection,
        wallet.payer,
        wallet.publicKey,
        null,
        9,
      );
      mint = m;
      console.log(m.toString());
      const userTokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        m,
        wallet.publicKey,
      );
      await mintTo(
        provider.connection,
        wallet.payer,
        m,
        userTokenAccount,
        wallet.payer,
        10000000 * 10 ** 9,
      );
      const tokenAccount = await createAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        m,
        new PublicKey("58V6myLoy5EVJA3U2wPdRDMUXpkwg8Vfw5b6fHqi2mEj"),
      );
      await mintTo(
        provider.connection,
        wallet.payer,
        m,
        tokenAccount,
        wallet.payer,
        10000000 * 10 ** 9,
      )
    };
    // derive the metadata account
    it("initializes", async () => {
      //await setupToken();
      await program.methods.initialize().accounts({
        programAuthority,
        bank,
        mint,
        user: wallet.publicKey,
      }).rpc();
    })
    it("funds", async () => {
      const userTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);
      await program.methods.fund(new anchor.BN(1000)).accounts({
        user: wallet.publicKey,
        bank,
        userTokenAccount,
      }).rpc();
      const accountInfo = await getAccount(provider.connection, bank);
      assert(accountInfo.amount > BigInt(0), "Bank not funded");
    })
    it("initializes user account", async () => {
      const [stakeInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId,
      );
      // const account1 = await program.account.stakeInfo.fetch(stakeInfo);
      // console.log(account1);
      await program.methods.initializeUser().accounts({
        user: wallet.publicKey,
        stakeInfo,
      }).rpc();
      const account = await program.account.stakeInfo.fetch(stakeInfo);
      assert(account, "Account not fetched");
    });
    it("stakes single", async () => {
      const {mint: nftMint, associatedTokenAccount: nftAccount, metadataAccount} = await mintNft();
      console.log("minted");
      const [stakeInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId
      );
      const [stakeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_account"), wallet.publicKey.toBuffer(), nftAccount.toBuffer()],
        program.programId
      );
      await program.methods.stake().accounts({
        user: wallet.publicKey,
        stakeInfo,
        stakeAccount,
        nftAccount,
        nftMetadataAccount: metadataAccount,
        nftMint: nftMint.publicKey,
        programAuthority,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
      }).signers([wallet.payer]).rpc();
      const stakeAccountInfo = await getAccount(provider.connection, stakeAccount);
      assert(stakeAccountInfo.amount === BigInt(1), "User did not send nft");
    })
    it("stakes and unstakes nft", async () => {
      const {mint: nftMint, associatedTokenAccount: nftAccount, metadataAccount} = await mintNft();
      console.log("mints");
      const [stakeInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId,
      );
      const [stakeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_account"), wallet.publicKey.toBuffer(), nftAccount.toBuffer()],
        program.programId
      )
      await program.methods.stake().accounts({
        user: wallet.publicKey,
        stakeInfo,
        stakeAccount,
        nftAccount,
        nftMetadataAccount: metadataAccount,
        nftMint: nftMint.publicKey,
        programAuthority,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
      }).signers([wallet.payer]).rpc();
      const stakeAccountInfo = await getAccount(provider.connection, stakeAccount);
      assert(stakeAccountInfo.amount === BigInt(1), "User did not send nft");
      console.log("staked");
      const userTokenAccountBefore = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        mint,
        wallet.publicKey,
      );
      await program.methods.unstake().accounts({
        user: wallet.publicKey,
        userTokenAccount: userTokenAccountBefore.address,
        stakeInfo,
        stakeAccount,
        nftAccount,
        programAuthority,
        bank
      }).rpc();
      const userTokenAccountAfter = await getAccount(provider.connection, userTokenAccountBefore.address);
      assert(userTokenAccountAfter.amount > userTokenAccountBefore.amount, "User did not get token");
    });
    it("claims", async () => {
      const {mint: nftMint, associatedTokenAccount: nftAccount, metadataAccount} = await mintNft();
      const [stakeInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId,
      );
      const [stakeAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake_account"), wallet.publicKey.toBuffer(), nftAccount.toBuffer()],
        program.programId
      )
      console.log(stakeInfo);
      const account = await program.account.stakeInfo.fetch(stakeInfo);
      console.log(account);
      await program.methods.stake().accounts({
        user: wallet.publicKey,
        stakeInfo,
        stakeAccount,
        nftAccount,
        nftMetadataAccount: metadataAccount,
        nftMint: nftMint.publicKey,
        programAuthority,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
      }).signers([wallet.payer]).rpc();

      const userTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);
      const before = await getAccount(provider.connection, userTokenAccount);
      await program.methods.claim().accounts({
        user: wallet.publicKey,
        stakeInfo,
        bank,
        programAuthority,
        userTokenAccount
      }).rpc();
      const after = await getAccount(provider.connection, userTokenAccount);
      assert(after.amount > before.amount, "User did not get tokens");
    });
    it("stakes and claims multiple", async () => {
      const [stakeInfo] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), wallet.publicKey.toBuffer()],
        program.programId,
      );

      const mints: anchor.web3.Keypair[] = [], tokenAccounts: anchor.web3.PublicKey[] = [], metadataAccounts = [];
      for (let i = 0; i < 5; i++) {
        const {mint: nftMint, associatedTokenAccount: nftAccount, metadataAccount} = await mintNft();
        mints.push(nftMint);
        tokenAccounts.push(nftAccount);
        metadataAccounts.push(metadataAccount);
      }
      const accountBefore = await program.account.stakeInfo.fetch(stakeInfo);
      const transaction = new anchor.web3.Transaction();
      for (let i = 0; i < mints.length; i++) {
        const [stakeAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("stake_account"), wallet.publicKey.toBuffer(), tokenAccounts[i].toBuffer()],
          program.programId
        )
        const t = await program.methods.stake().accounts({
          user: wallet.publicKey,
          stakeInfo,
          stakeAccount,
          nftAccount: tokenAccounts[i],
          nftMetadataAccount: metadataAccounts[i],
          nftMint: mints[i].publicKey,
          programAuthority,
          tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        }).signers([wallet.payer]).transaction();
        transaction.add(t);
      }
      await provider.sendAndConfirm(transaction);
      const accountAfter = await program.account.stakeInfo.fetch(stakeInfo);
      assert(accountAfter.mints.length > accountBefore.mints.length, "Did not add");
      const userTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);
      await program.methods.claim().accounts({
        user: wallet.publicKey,
        stakeInfo,
        userTokenAccount,
        bank,
        programAuthority,
      }).rpc();
    })
    it("mints nft!", async () => {
      const mint = anchor.web3.Keypair.generate();

      // Derive the associated token address account for the mint
      const associatedTokenAccount = await getAssociatedTokenAddress(
          mint.publicKey,
          wallet.publicKey
      );
  
      // derive the metadata account
      let metadataAccount = findMetadataPda(umi, {
          mint: publicKey(mint.publicKey),
      })[0];
  
      //derive the master edition pda
      let masterEditionAccount = findMasterEditionPda(umi, {
          mint: publicKey(mint.publicKey),
      })[0];
          const tx = await program.methods
              .mintNft()
              .accounts({
                  signer: wallet.publicKey,
                  mint: mint.publicKey,
                  associatedTokenAccount,
                  metadataAccount,
                  programAuthority,
                  masterEditionAccount,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                  tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
                  systemProgram: anchor.web3.SystemProgram.programId,
                  rent: anchor.web3.SYSVAR_RENT_PUBKEY,
              })
              .signers([mint])
              .rpc();
  
          console.log(
              `mint nft tx: https://explorer.solana.com/tx/${tx}?cluster=devnet`
          );
          console.log(
              `minted nft: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`
          );
    });
});
