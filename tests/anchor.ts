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

  const nvmPublicKey = new anchor.web3.PublicKey("HgU4FjuaXLQEen3rDDjygCSS5xj8maGci5eEuzKVJXYZ")

  const program = anchor.workspace.Anchor as Program<Anchor>;
  const connection = program.provider.connection;
  // const payer = provider.wallet as anchor.Wallet;
  const payer = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();
  const server = anchor.web3.Keypair.generate();
  const mintKeypair = anchor.web3.Keypair.generate();

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
  const nvmATA = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    nvmPublicKey,
    true
  )

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

  const [providerAA] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("provider"),
      payer.publicKey.toBytes(),
      testAA.toBytes(),
      server.publicKey.toBytes(),
    ],
    program.programId
  );

  it("Init accounts", async () => {
    console.log(await connection.requestAirdrop(receiver.publicKey, 1000000000));
    await connection.requestAirdrop(payer.publicKey, 1000000000);
    await connection.requestAirdrop(server.publicKey, 1000000000);

    // console.log(receiver.publicKey, pubkey)
    console.log(nvmATA, nvmPublicKey)

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
    await getOrCreateAssociatedTokenAccount(
      connection,
      receiver,
      mintKeypair.publicKey,
      nvmPublicKey,
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
    await mintTo(
      connection,
      creator,
      mintKeypair.publicKey,
      nvmATA,
      creator.publicKey,
      1000000 * 10 ** 6
    );
  })


  it("Create info", async () => {
    const tx = new anchor.web3.Transaction();

    /*
    console.log(await connection.getAccountInfo(payer.publicKey));
    console.log(await connection.getBalance(payer.publicKey, {commitment: "processed"}));

    console.log(receiver.publicKey, payer.publicKey)
    */

    const ix = await program.methods
      .createInfo(new anchor.BN(120 * 10**6), new anchor.BN(10), [...Array(256).keys()])
      .accounts({
        signer: payer.publicKey,
        newAccount: testAA,
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

  it("Create provider", async () => {
    const tx = new anchor.web3.Transaction();

    const ix = await program.methods
      .createProvider()
      .accounts({
        signer: payer.publicKey,
        provider: server.publicKey,
        info: testAA,
        newAccount: providerAA,
      })
      .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [payer]
    );
  })

  it("create subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .createEmpty()
    .accounts({
      signer: receiver.publicKey,
      info: testAA,
      newAccount: subAA,
    })
    .instruction();

    tx.add(ix);

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
      nvmAa: nvmATA,
      mint: mintKeypair.publicKey,
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

    console.log(await getAccount(connection, nvmATA))

  });

  it("mint subscription", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .mintSubscription(new anchor.BN(100))
    .accounts({
      signer: payer.publicKey,
      info: testAA,
      sub: subAA,
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

  it("mint subscription with provider", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .mintSubscriptionProvider(new anchor.BN(100))
    .accounts({
      signer: server.publicKey,
      info: testAA,
      sub: subAA,
      provider: providerAA,
   })
    .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [server]
    );
    // console.log(await program.account.subscription.fetch(subAA))
    expect("110").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())

  });

  it("burn subscription with provider", async () => {

    const tx = new anchor.web3.Transaction();
    const ix = await program.methods
    .burnSubscriptionProvider(new anchor.BN(100))
    .accounts({
      signer: server.publicKey,
      info: testAA,
      sub: subAA,
      provider: providerAA,
   })
    .instruction();

    tx.add(ix);

    const sig = await anchor.web3.sendAndConfirmTransaction(
      program.provider.connection,
      tx,
      [server]
    );
    expect("10").to.eq((await program.account.subscription.fetch(subAA)).tokens.toString())
  });

});
