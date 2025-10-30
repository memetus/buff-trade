import { NextResponse } from "next/server";
import dotenv from "dotenv";
import { OKXDexClient } from "@okx-dex/okx-dex-sdk";
import { BaseWallet } from "@/shared/constants/wallet";
import { Connection, Keypair } from "@solana/web3.js";

dotenv.config();

export async function POST(request: Request) {
  const params = await request.json();
  const keypair = Keypair.generate();
  const connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  );
  const wallet = new BaseWallet(keypair, connection);

  const client = new OKXDexClient({
    apiKey: process.env.OKX_API_KEY!,
    secretKey: process.env.OKX_SECRET_KEY!,
    apiPassphrase: process.env.OKX_API_PASSPHRASE!,
    projectId: process.env.OKX_PROJECT_ID!,
    solana: {
      wallet: {
        publicKey: wallet.publicKey!,
        connection: wallet.connection,
        signTransaction: wallet.signTransaction!,
        signAllTransactions: wallet.signAllTransactions!,
        signAndSendTransaction: wallet.signAndSendTransaction!,
        signMessage: wallet.signMessage!,
      },
    },
  });

  try {
    const data = await client.dex.getSwapData(params);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(error);
  }
}
