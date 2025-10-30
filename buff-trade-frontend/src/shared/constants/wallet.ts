import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SendOptions,
  TransactionSignature,
  Connection,
} from "@solana/web3.js";

export interface IBaseWallet {
  readonly publicKey: PublicKey;
  readonly connection: Connection;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>;
  signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: SendOptions
  ): Promise<{
    signature: TransactionSignature;
  }>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

// export declare class BaseWallet implements IBaseWallet {
//   readonly publicKey: PublicKey;
//   readonly connection: Connection;
//   private readonly payer;
//   constructor(keypair: Keypair, connection: Connection);
//   signTransaction<T extends Transaction | VersionedTransaction>(
//     transaction: T
//   ): Promise<T>;
//   signAllTransactions<T extends Transaction | VersionedTransaction>(
//     transactions: T[]
//   ): Promise<T[]>;
//   signAndSendTransaction<T extends Transaction | VersionedTransaction>(
//     transaction: T,
//     options?: SendOptions
//   ): Promise<{
//     signature: TransactionSignature;
//   }>;
//   signMessage(message: Uint8Array): Promise<Uint8Array>;
// }

export class BaseWallet implements IBaseWallet {
  readonly publicKey: PublicKey;
  readonly connection: Connection;
  private readonly payer: Keypair;

  constructor(keypair: Keypair, connection: Connection) {
    this.payer = keypair;
    this.publicKey = keypair.publicKey;
    this.connection = connection;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    if ("partialSign" in transaction) {
      transaction.partialSign(this.payer);
    }
    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    return transactions.map((tx) => {
      if ("partialSign" in tx) {
        tx.partialSign(this.payer);
      }
      return tx;
    });
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: SendOptions
  ): Promise<{ signature: TransactionSignature }> {
    if ("partialSign" in transaction) {
      transaction.partialSign(this.payer);
    }
    const signature = await this.connection.sendRawTransaction(
      transaction.serialize(),
      options
    );
    return { signature };
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return Uint8Array.from("");
  }
}
