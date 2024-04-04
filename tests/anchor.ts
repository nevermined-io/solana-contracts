import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Anchor } from "../target/types/anchor";
import { getAccount } from "@solana/spl-token";
import { expect } from "chai";

import {
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


describe("anchor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Anchor as Program<Anchor>;
  const connection = program.provider.connection;
  const TOKEN_2022_PROGRAM_ID = new anchor.web3.PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
  );
  // const payer = provider.wallet as anchor.Wallet;
  const payer = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();
  const mintKeypair = anchor.web3.Keypair.generate();
  const ATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  );

  const tokenName = "TestToken";
  const [mint] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("token-2022-token"),
      payer.publicKey.toBytes(),
      Buffer.from(tokenName),
      receiver.publicKey.toBytes(),
    ],
    program.programId
  );
  const [payerATA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      payer.publicKey.toBytes(),
      TOKEN_2022_PROGRAM_ID.toBytes(),
      mint.toBytes(),
    ],
    ATA_PROGRAM_ID
  );

  const payerATA1 = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    payer.publicKey,
    true
  )
  const receiverATA1 = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    receiver.publicKey,
    true
  )

  const [receiverATA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      receiver.publicKey.toBytes(),
      TOKEN_2022_PROGRAM_ID.toBytes(),
      mint.toBytes(),
    ],
    ATA_PROGRAM_ID
  );

  const [testAA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("test"),
      payer.publicKey.toBytes(),
    ],
    program.programId
  );

  const [subAA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("test"),
      receiver.publicKey.toBytes(),
      testAA.toBytes(),
    ],
    program.programId
  );

  it("init accounts", async () => {
    console.log(await connection.requestAirdrop(receiver.publicKey, 1000000000));
    await connection.requestAirdrop(payer.publicKey, 1000000000);
    await connection.requestAirdrop(payer.publicKey, 1000000000);

    await sleep(1000);

    /*
    console.log(await connection.getAccountInfo(payer.publicKey));
    console.log(await connection.getBalance(payer.publicKey, {commitment: "processed"}));

    console.log(receiver.publicKey, payer.publicKey)
    */
  })

  it("Create tokens", async () => {
    let creator = payer
    await createMint(
      connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      6,
      mintKeypair
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintKeypair.publicKey,
      payer.publicKey,
      true
    );
    await getOrCreateAssociatedTokenAccount(
      connection,
      receiver,
      mintKeypair.publicKey,
      receiver.publicKey,
      true
    );
    await mintTo(
      connection,
      creator,
      mintKeypair.publicKey,
      payerATA1,
      creator.publicKey,
      1000000 * 10 ** 6
    );
    await mintTo(
      connection,
      creator,
      mintKeypair.publicKey,
      receiverATA1,
      creator.publicKey,
      1000000 * 10 ** 6
    );
  })


  it("Create something", async () => {
    const tx = new anchor.web3.Transaction();

    /*
    console.log(await connection.getAccountInfo(payer.publicKey));
    console.log(await connection.getBalance(payer.publicKey, {commitment: "processed"}));

    console.log(receiver.publicKey, payer.publicKey)
    */

    const ix = await program.methods
      .createTest(new anchor.BN(12), new anchor.BN(10), [...Array(256).keys()])
      .accounts({
        signer: payer.publicKey,
        newAccount: testAA,
        providerAa: payerATA1,
        mint: mintKeypair.publicKey,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    /*
    console.log("Your transaction signature", sig);

    console.log(await program.account.service.fetch(testAA))
    console.log(await connection.getAccountInfo(testAA))

    console.log(program.programId)
    */
  })

  it("create subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .createEmpty()
    .accounts({
      signer: receiver.publicKey,
      provider: payer.publicKey,
      info: testAA,
      newAccount: subAA,
    })
    .instruction();

    tx.add(ix);

    // console.log("hmm what")
    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [receiver]
    );
    expect("0").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())

  });

  it("buy subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .buySubscription()
    .accounts({
      signer: receiver.publicKey,
      info: testAA,
      sub: subAA,
      providerAa: payerATA1,
      consumerAa: receiverATA1,
      mint: mintKeypair.publicKey,
      // tokenProgram: TOKEN_2022_PROGRAM_ID,
      // associatedTokenProgram: ATA_PROGRAM_ID,
   })
    .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [receiver]
    );
    // console.log(await program.account.subscription.fetch(subAA))
    expect("10").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())

  });

  it("mint subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .mintSubscription(new anchor.BN(100))
    .accounts({
      signer: payer.publicKey,
      info: testAA,
      sub: subAA,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
   })
    .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    // console.log(await program.account.subscription.fetch(subAA))
    expect("110").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())

  });

  it("burn subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .burnSubscription(new anchor.BN(100))
    .accounts({
      signer: payer.publicKey,
      info: testAA,
      sub: subAA,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
   })
    .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    expect("10").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())
  });

});
