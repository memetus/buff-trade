export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getNetworkConfig } from "@/shared/utils/networkConfig";

export async function GET(request: NextRequest) {
  try {
    const { endpoint, network, genesisHash } = getNetworkConfig();

    const connection = new Connection(endpoint, "confirmed");

    // Test 1: Get latest blockhash (no cost)
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Test 2: Get genesis hash to verify network
    const actualGenesisHash = await connection.getGenesisHash();
    const isCorrectNetwork = actualGenesisHash === genesisHash;

    // Test 3: Get recent performance samples (no cost)
    const performanceSamples = await connection.getRecentPerformanceSamples(1);

    // Test 4: Get cluster nodes (no cost)
    const clusterNodes = await connection.getClusterNodes();

    return NextResponse.json({
      success: true,
      network: network,
      endpoint: endpoint,
      tests: {
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        genesisHash: actualGenesisHash,
        isCorrectNetwork: isCorrectNetwork,
        performanceSamples: performanceSamples.length,
        clusterNodes: clusterNodes.length,
      },
      message: `Successfully connected to ${network} network!`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `Failed to connect to ${getNetworkConfig().network} network`,
      },
      { status: 500 }
    );
  }
}
