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
  })

  it("Create Token-2022 Token", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
      .createToken(tokenName)
      .accounts({
        mint: mint, // this is the account to be created
        signer: payer.publicKey,
        extra: receiver.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    console.log("Your transaction signature", sig);
  });

  it("Initialize payer ATA", async () => {
    // console.log(await connection.getBalance(payer.publicKey));
    await sleep(200);
    const tx = new anchor.web3.Transaction();

    const ix = await program.methods
      .createAssociatedTokenAccount()
      .accounts({
        tokenAccount: payerATA,
        mint: mint,
        signer: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    console.log("Your transaction signature", sig);
  });


  it("Mint Token to payer", async () => {
    // console.log(await connection.getBalance(payer.publicKey));
    await sleep(200);
    // console.log(await connection.getAccountInfo(payerATA));

    // console.log("token data", await getAccount(connection, payerATA, undefined, TOKEN_2022_PROGRAM_ID))

    const tx = new anchor.web3.Transaction();

    const ix = await program.methods
      .mintToken(new anchor.BN(200000000))
      .accounts({
        mint: mint,
        signer: payer.publicKey,
        receiver: payerATA,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([payer])
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    console.log("Your transaction signature", sig);
  });

  // Using init in the transfer instruction, as init if needed is bot working with Token 2022 yet.
  it("Transfer Token", async () => {
    await sleep(200);
    // console.log("token data", await getAccount(connection, payerATA, undefined, TOKEN_2022_PROGRAM_ID))
    const tx = new anchor.web3.Transaction();

    const ix = await program.methods
      .transferToken(new anchor.BN(100))
      .accounts({
        mint: mint,
        signer: payer.publicKey,
        from: payerATA,
        to: receiver.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ATA_PROGRAM_ID,
        toAta: receiverATA,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
    console.log("Your transaction signature", sig);
  });

  it("Transfer Token (2)", async () => {
    await sleep(200);
    // console.log("token data", await getAccount(connection, payerATA, undefined, TOKEN_2022_PROGRAM_ID))
    const tx = new anchor.web3.Transaction();

    const ix = await program.methods
      .transferToken2(new anchor.BN(1))
      .accounts({
        mint: mint,
        signer: receiver.publicKey,
        from: receiverATA,
        to: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ATA_PROGRAM_ID,
        toAta: payerATA,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [receiver]
    );
    // console.log("Your transaction signature", sig);
  });

  it("Create something", async () => {
    const tx = new anchor.web3.Transaction();

    /*
    console.log(await connection.getAccountInfo(payer.publicKey));
    console.log(await connection.getBalance(payer.publicKey, {commitment: "processed"}));

    console.log(receiver.publicKey, payer.publicKey)
    */

    const ix = await program.methods
      .createTest(new anchor.BN(12))
      .accounts({
        signer: payer.publicKey,
        newAccount: testAA,
        providerAa: payerATA,
        mint: mint,
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
      providerAa: payerATA,
      consumerAa: receiverATA,
      mint: mint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ATA_PROGRAM_ID,
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
