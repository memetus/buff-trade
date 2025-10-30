export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { Connection, VersionedTransaction } from "@solana/web3.js";

export async function POST(request: NextRequest) {
  try {
    const { signedTransaction } = await request.json();

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Signed transaction is required" },
        { status: 400 }
      );
    }

    const endpoints = [
      process.env.NEXT_PUBLIC_HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
        : null,
      "https://api.mainnet-beta.solana.com",
      "https://mainnet.helius-rpc.com",
    ].filter(Boolean) as string[];

    for (const endpoint of endpoints) {
      try {
        const connection = new Connection(endpoint, {
          commitment: "confirmed",
          confirmTransactionInitialTimeout: 120000,
        });

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("finalized");

        // Deserialize the signed transaction
        const transactionBuffer = Buffer.from(signedTransaction, "base64");
        const transaction = VersionedTransaction.deserialize(transactionBuffer);

        // Send the transaction with more lenient settings
        const signature = await connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false, // Enable preflight for mainnet safety
            preflightCommitment: "confirmed",
            maxRetries: 5, // 재시도 횟수 증가
          }
        );

        // Confirm the transaction
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          return NextResponse.json(
            {
              error: "Transaction failed",
              details: confirmation.value.err,
              signature,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          signature,
          blockhash,
          lastValidBlockHeight,
          endpoint: endpoint.includes("helius")
            ? "Helius Mainnet"
            : "Solana Mainnet",
        });
      } catch (error) {
        continue;
      }
    }

    return NextResponse.json(
      { error: "All RPC endpoints failed for transaction" },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
