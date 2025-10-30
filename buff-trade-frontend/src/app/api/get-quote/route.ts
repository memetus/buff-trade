import { generateQuery } from "@/shared/utils/geneateQuery";
import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function POST(request: Request) {
  const params = await request.json();
  try {
    const url = "https://web3.okx.com/api/v5/dex/aggregator/quote";
    const query = generateQuery(url, params);

    const res = await fetch(query, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": process.env.OKX_API_KEY!,
        "OK-ACCESS-SIGN": process.env.OKX_SECRET_KEY!,
        "OK-ACCESS-PASSPHRASE": process.env.OKX_API_PASSPHRASE!,
        "OK-ACCESS-TIMESTAMP": new Date().toISOString(),
      },
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(error);
  }
}
