import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Mycelium } from "../target/types/mycelium";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
    findMasterEditionPda,
    findMetadataPda,
    mplTokenMetadata,
    MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("mycelium", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);


  const program = anchor.workspace.Mycelium as Program<Mycelium>;
    const wallet = provider.wallet;

    const umi = createUmi("https://api.devnet.solana.com")
        .use(walletAdapterIdentity(wallet))
        .use(mplTokenMetadata());

    const mint = anchor.web3.Keypair.generate();

    // Derive the associated token address account for the mint
    const associatedTokenAccount = getAssociatedTokenAddressSync(
        mint.publicKey,
        wallet.publicKey
    );
    const [programAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("auth")],
      program.programId,
    )
    // derive the metadata account
    let metadataAccount = findMetadataPda(umi, {
        mint: publicKey(mint.publicKey),
    })[0];

    //derive the master edition pda
    let masterEditionAccount = findMasterEditionPda(umi, {
        mint: publicKey(mint.publicKey),
    })[0];

    it("mints nft!", async () => {
      const [collectionMint] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint")],
        program.programId,
      );
      const [collectionMetadataAccount] = findMetadataPda(umi, {mint: publicKey(mint.publicKey)})
      const [collectionMasterEditionAccount] = findMasterEditionPda(umi, {mint: publicKey(mint.publicKey)});
      const collectionAssociatedTokenAccount = getAssociatedTokenAddressSync(
        collectionMint,
        wallet.publicKey,
      );
      console.log("here");
      const tx1 = await program.methods.initialize().accounts({
        user: wallet.publicKey,
        mint: collectionMint,
        associatedTokenAccount: collectionAssociatedTokenAccount,
        metadataAccount: collectionMetadataAccount,
        masterEditionAccount: collectionMasterEditionAccount,
        programAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }).rpc();
        const tx2 = await program.methods
            .mintNft()
            .accounts({
                user: wallet.publicKey,
                mint: mint.publicKey,
                associatedTokenAccount,
                metadataAccount,
                masterEditionAccount,
                programAuthority,
                collection: collectionMint,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mint])
            .rpc();

        // console.log(
        //     `mint nft tx: https://explorer.solana.com/tx/${tx1}?cluster=devnet`
        // );
        console.log(`minted nft: https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);
        console.log(`Minted collection nft: https://explorer.solana.com/address/${collectionMint}?cluster=devnet`)
    });
});
