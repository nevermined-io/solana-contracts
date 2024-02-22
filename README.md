[![banner](https://raw.githubusercontent.com/nevermined-io/assets/main/images/logo/banner_logo.png)](https://nevermined.io)

# Nevermined Solana Contracts

Nevermined Subscription contracts for Solana

---

## Table of Contents

- [Nevermined Solana Contracts](#nevermined-solana-contracts)
  - [Table of Contents](#table-of-contents)
  - [Scope](#scope)
    - [Allow the registration of subscriptions](#allow-the-registration-of-subscriptions)
    - [Allow the purchase of subscriptions](#allow-the-purchase-of-subscriptions)
    - [Minting of credits](#minting-of-credits)
    - [Burn of credits](#burn-of-credits)
    - [Balance of credits](#balance-of-credits)
    - [Access control](#access-control)
      - [Add Providers](#add-providers)
      - [Revoke Providers](#revoke-providers)
  - [Architecture](#architecture)

---


## Scope

The objective of this repository is to provide the necessary smart contracts to enable the Nevermined Subscription protocol on the Solana blockchain.
The main capabilities of the contracts are:

### Allow the registration of subscriptions

* Any user can register a subscription by providing the necessary information
* Every different subscription is identified by a unique identifier (tokenId)
* The attributes of each indivudual subscription are the following:
  - `tokenId`: Unique identifier of the subscription
  - `owner`: Address of the user that registered the subscription
  - `price`: Amount of SOL that the user is willing to pay for the subscription
  - `credits`: Amount of credits that the user will receive every time the subscription is purchased
  - `providers`: List of accounts that are allowed to interact with the subscription
  - `metadata`: Additional information about the subscription

### Allow the purchase of subscriptions

* Any user can purchase a subscription make the payment of the price
* The user will provide the tokenId and the exact amount of SOL to be paid
* Nevermined will get a `1%` fee of the transaction
* The user will receive the credits associated with the subscription
* The user can call this function multiple times allowing to accumulate credits

### Minting of credits

* The owner and the providers of the subscription can mint credits to the subscription
* The credits can be minted as a result of a purchase process or as a result of a direct minting

### Burn of credits

* The owner and the providers of the subscription can burn credits from the subscription

### Balance of credits

* The balance of credits can be be obtained by any user

### Access control

#### Add Providers

* The subscription owner must be able to add providers for the subscription

#### Revoke Providers

* The subscription owner must be able to revoke providers from the subscription

## Architecture

To be defined