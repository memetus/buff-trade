import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getNetworkConfig } from "@/shared/utils/networkConfig";

type WalletTokenInfo = {
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
  uiAmount: number;
};

const createConnection = () => {
  const { endpoint } = getNetworkConfig();
  return new Connection(endpoint, "confirmed");
};

export const fetchBalance = async (address: string | null) => {
  if (!address) {
    return { result: { value: 0 } };
  }

  try {
    const connection = createConnection();
    const lamports = await connection.getBalance(new PublicKey(address));
    const sol = lamports / LAMPORTS_PER_SOL;
    return { result: { value: sol } };
  } catch (error) {
    return { result: { value: 0 } };
  }
};

export const fetchTokenBalance = async (
  owner: string | null,
  mint: string | null
) => {
  if (!owner || !mint) {
    return { amount: 0, decimals: 0, uiAmount: 0 };
  }

  try {
    const connection = createConnection();
    const response = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(owner),
      { mint: new PublicKey(mint) }
    );

    const account = response.value?.[0];
    if (!account) {
      return { amount: 0, decimals: 0, uiAmount: 0 };
    }

    const info: any = account.account.data.parsed.info;
    const amountInfo = info.tokenAmount || {};
    const amount = amountInfo.amount ? Number(amountInfo.amount) : 0;
    const decimals = amountInfo.decimals ?? 0;
    const uiAmount =
      amountInfo.uiAmount ?? (decimals > 0 ? amount / 10 ** decimals : amount);

    return {
      amount,
      decimals,
      uiAmount,
    };
  } catch (error) {
    return { amount: 0, decimals: 0, uiAmount: 0 };
  }
};

export const fetchWalletTokens = async (
  owner: string | null
): Promise<WalletTokenInfo[]> => {
  if (!owner) {
    return [];
  }

  try {
    const connection = createConnection();
    const response = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(owner),
      { programId: TOKEN_PROGRAM_ID }
    );

    return response.value
      .map((acc) => {
        const info: any = acc.account.data.parsed.info;
        const amountInfo = info.tokenAmount || {};
        const amount = amountInfo.amount ? Number(amountInfo.amount) : 0;
        const decimals = amountInfo.decimals ?? 0;
        const uiAmount =
          amountInfo.uiAmount ?? (decimals > 0 ? amount / 10 ** decimals : amount);
        return {
          mint: info.mint as string,
          owner: info.owner as string,
          amount,
          decimals,
          uiAmount,
        };
      })
      .filter((token) => (token.uiAmount || 0) > 0);
  } catch (error) {
    return [];
  }
};
