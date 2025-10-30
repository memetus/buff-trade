import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@solana/web3.js';
import { CreateSwapDto } from '../dto/req.dto';
import { OKXDexClient } from '@okx-dex/okx-dex-sdk';
import { createWallet } from './wallet';

export interface ParseAccountResponse {
  status: 'success' | 'error';
  message: string;
  programName: string;
  inputAmount: string;
  inputToken: string;
  outputAmount: string;
  outputToken: string;
}

export interface TokenBalance {
  tokenAddress: string;
  walletAddress: string;
  balance: string;
  decimals?: number;
}

export interface SolBalance {
  address: string;
  balance: number;
  rawBalance: number;
}

export interface ParseTransactionResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    signature: string;
    blockTime: number;
    slot: number;
    fee: number;
    success: boolean;
    type: string;
    description: string;
    source: string;
    accountData: any[];
    tokenTransfers: any[];
    nativeTransfers: any[];
    instructions: any[];
  } | null;
}

export interface SwapInfo {
  signature: string;
  success: boolean;
  fee: number;
  source: string;
  description: string;
  fromToken: {
    symbol: string;
    amount: number;
    mint: string;
  };
  toToken: {
    symbol: string;
    amount: number;
    mint: string;
  };
  userAccount: string;
}

export interface SwapResponse {
  status: 'success' | 'error';
  message: string;
  data?: SwapInfo | null;
}

@Injectable()
export class SendaiService implements OnModuleInit {
  private okxDexClient: OKXDexClient;
  private readonly wallet: any;

  constructor(private configService: ConfigService) {
    const connection = new Connection(
      this.configService.get<string>('ai-agent.solanaRpcUrl'),
    );

    this.wallet = createWallet(
      this.configService.get<string>('ai-agent.walletKey'),
      connection,
    );
  }

  onModuleInit() {
    this.initializeOKXDexClient();
  }

  private async initializeOKXDexClient() {
    try {
      this.okxDexClient = new OKXDexClient({
        apiKey: this.configService.get<string>('ai-agent.okxApiKey')!,
        secretKey: this.configService.get<string>('ai-agent.okxSecretKey')!,
        apiPassphrase: this.configService.get<string>(
          'ai-agent.okxApiPassPhrase',
        )!,
        projectId: this.configService.get<string>('ai-agent.okxProjectId')!,
        solana: {
          wallet: this.wallet,
          computeUnits: 300000,
          maxRetries: 3,
        },
      });
      console.log('OKX DEX Client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OKX DEX Client:', error);
      throw error;
    }
  }

  async getQuote(createSwapDto: CreateSwapDto) {
    const { amount, fromTokenAddress, toTokenAddress } = createSwapDto;
    console.log('Getting quote for:', fromTokenAddress, toTokenAddress, amount);

    try {
      const rawAmount = (parseFloat(amount) * Math.pow(10, 9)).toString();
      console.log('Raw amount:', rawAmount);

      const quote = await this.okxDexClient.dex.getQuote({
        chainId: '501',
        fromTokenAddress,
        toTokenAddress,
        amount: rawAmount,
        slippage: '1',
      });

      console.log('Quote:', quote);

      const tokenInfo = {
        fromToken: {
          symbol: quote.data[0].fromToken.tokenSymbol,
          decimals: parseInt(quote.data[0].fromToken.decimal),
          price: quote.data[0].fromToken.tokenUnitPrice,
        },
        toToken: {
          symbol: quote.data[0].toToken.tokenSymbol,
          decimals: parseInt(quote.data[0].toToken.decimal),
          price: quote.data[0].toToken.tokenUnitPrice,
        },
      };

      return {
        fromToken: tokenInfo.fromToken,
        toToken: tokenInfo.toToken,
        amount: amount,
        rawAmount: rawAmount,
        usdValue: (
          parseFloat(amount) * parseFloat(tokenInfo.fromToken.price)
        ).toFixed(2),
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  async executeSwap(createSwapDto: CreateSwapDto) {
    try {
      const { amount, fromTokenAddress, toTokenAddress } = createSwapDto;

      console.log('Getting token information...');
      const quote = await this.getQuote(createSwapDto);

      console.log('\nSwap Details:');
      console.log('--------------------');
      console.log(`From: ${quote.fromToken.symbol}`);
      console.log(`To: ${quote.toToken.symbol}`);
      console.log(`Amount: ${amount} ${quote.fromToken.symbol}`);
      console.log(`Amount in base units: ${quote.rawAmount}`);
      console.log(`Approximate USD value: $${quote.usdValue}`);

      // Execute the swap
      console.log('\nExecuting swap...');
      try {
        const result = await this.okxDexClient.dex.executeSwap({
          chainId: '501',
          fromTokenAddress,
          toTokenAddress,
          amount: quote.rawAmount,
          slippage: '0.2',
          userWalletAddress: this.wallet.publicKey.toString(),
        });

        if (result.transactionId) {
          console.log('\nSwap transaction submitted!');
          console.log('Transaction ID:', result.transactionId);
          console.log('Explorer URL:', result.explorerUrl);

          return {
            status: 'submitted',
            transactionId: result.transactionId,
            explorerUrl: result.explorerUrl,
            message:
              'Transaction submitted. Please check the status in Explorer.',
          };
        }
      } catch (swapError: any) {
        if (swapError.message?.includes('Blockhash not found')) {
          console.log('Blockhash error, retrying with new blockhash...');
          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return this.executeSwap(createSwapDto);
        }

        // Handle successful transaction with signature
        if (swapError.signature) {
          console.log('\nSwap transaction submitted!');
          console.log('Transaction signature:', swapError.signature);
          console.log(
            'Explorer URL:',
            `https://solscan.io/tx/${swapError.signature}`,
          );

          return {
            status: 'submitted',
            signature: swapError.signature,
            explorerUrl: `https://solscan.io/tx/${swapError.signature}`,
            message:
              'Transaction submitted. Please check the status in Explorer.',
          };
        }
        throw swapError;
      }

      throw new Error('Transaction submission failed');
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }

  async getTokens() {
    try {
      const tokens = await this.okxDexClient.dex.getTokens('501');
      console.log('Supported tokens:', JSON.stringify(tokens, null, 2));
      return tokens;
    } catch (error) {
      console.error('Error getting chain data:', {
        error: error.message,
        status: error.status,
        response: error.response?.data,
      });
      throw error;
    }
  }

  async parseTransaction(
    transactionSignature: string,
  ): Promise<ParseTransactionResponse> {
    try {
      const heliusApiKey = this.configService.get<string>(
        'ai-agent.heliusApiKey',
      );

      if (!heliusApiKey) {
        throw new Error('Helius API key is not configured.');
      }

      const url = `https://api.helius.xyz/v0/transactions/?api-key=${heliusApiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: [transactionSignature],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.length) {
        throw new Error('Transaction not found.');
      }

      const transaction = data[0];

      return {
        status: 'success',
        data: {
          signature: transaction.signature,
          blockTime: transaction.blockTime,
          slot: transaction.slot,
          fee: transaction.fee,
          success: !transaction.err,
          type: transaction.type || 'UNKNOWN',
          description: transaction.description || '',
          source: transaction.source || '',
          accountData: transaction.accountData || [],
          tokenTransfers: transaction.tokenTransfers || [],
          nativeTransfers: transaction.nativeTransfers || [],
          instructions: transaction.instructions || [],
        },
        message: 'Transaction parsing completed.',
      };
    } catch (error) {
      console.error('Transaction parsing error:', error);
      return {
        status: 'error',
        message: `Transaction parsing failed: ${error.message}`,
        data: null,
      };
    }
  }

  async parseSwapTransaction(
    transactionSignature: string,
  ): Promise<SwapResponse> {
    try {
      const parseResult = await this.parseTransaction(transactionSignature);

      if (parseResult.status === 'error' || !parseResult.data) {
        return {
          status: 'error',
          message: parseResult.message,
          data: null,
        };
      }

      const transactionData = parseResult.data;

      // 🔥 FIX: Use tokenTransfers to detect swap instead of relying on type/description
      const tokenTransfers = transactionData.tokenTransfers;

      if (!tokenTransfers || tokenTransfers.length < 2) {
        return {
          status: 'error',
          message: `Not a swap transaction. Token transfers: ${tokenTransfers?.length || 0}`,
          data: null,
        };
      }

      // 🔥 FIX: Detect swap by analyzing tokenTransfers
      // Look for two transfers with different mints (SOL <-> Token)
      const solMint = 'So11111111111111111111111111111111111111112';

      let solTransfer = null;
      let tokenTransfer = null;

      // 🔥 FIX: Find the largest SOL transfer (main trade, not fees)
      let largestSolTransfer = null;
      let maxSolAmount = 0;

      for (const transfer of tokenTransfers) {
        if (transfer.mint === solMint) {
          if (transfer.tokenAmount > maxSolAmount) {
            maxSolAmount = transfer.tokenAmount;
            largestSolTransfer = transfer;
          }
        } else {
          tokenTransfer = transfer;
        }
      }

      solTransfer = largestSolTransfer;

      if (!solTransfer || !tokenTransfer) {
        return {
          status: 'error',
          message:
            'Not a valid swap transaction. Could not find SOL and token transfers.',
          data: null,
        };
      }

      // 🔥 FIX: Determine swap direction based on transfer directions
      let fromToken, toToken, fromSymbol, toSymbol;

      // Check if user is buying tokens (paying SOL)
      if (solTransfer.fromUserAccount === tokenTransfer.toUserAccount) {
        // User is buying tokens: SOL → Token
        fromToken = {
          symbol: 'SOL',
          amount: solTransfer.tokenAmount,
          mint: solMint,
        };
        toToken = {
          symbol: 'TOKEN',
          amount: tokenTransfer.tokenAmount,
          mint: tokenTransfer.mint,
        };
        fromSymbol = 'SOL';
        toSymbol = 'TOKEN';
      } else if (tokenTransfer.fromUserAccount === solTransfer.toUserAccount) {
        // User is selling tokens: Token → SOL
        fromToken = {
          symbol: 'TOKEN',
          amount: tokenTransfer.tokenAmount,
          mint: tokenTransfer.mint,
        };
        toToken = {
          symbol: 'SOL',
          amount: solTransfer.tokenAmount,
          mint: solMint,
        };
        fromSymbol = 'TOKEN';
        toSymbol = 'SOL';
      } else {
        return {
          status: 'error',
          message: 'Could not determine swap direction from token transfers.',
          data: null,
        };
      }

      console.log('✅ Swap transaction detected from tokenTransfers:');
      console.log(
        `- All SOL transfers found: ${tokenTransfers
          .filter((t) => t.mint === solMint)
          .map((t) => t.tokenAmount)
          .join(', ')}`,
      );
      console.log(`- Selected main SOL transfer: ${solTransfer.tokenAmount}`);
      console.log(
        `- Token transfer: ${tokenTransfer.tokenAmount} ${tokenTransfer.mint.substring(0, 8)}...`,
      );
      console.log(`- From: ${fromSymbol} ${fromToken.amount}`);
      console.log(`- To: ${toSymbol} ${toToken.amount}`);
      console.log(`- Type: ${transactionData.type}`);
      console.log(`- Description: ${transactionData.description}`);

      const swapInfo: SwapInfo = {
        signature: transactionData.signature,
        success: transactionData.success,
        fee: transactionData.fee,
        source: transactionData.source,
        description: transactionData.description,
        fromToken,
        toToken,
        userAccount: solTransfer.fromUserAccount,
      };

      return {
        status: 'success',
        message: 'Swap information extraction completed.',
        data: swapInfo,
      };
    } catch (error) {
      console.error('Swap transaction parsing error:', error);
      return {
        status: 'error',
        message: `Swap information extraction failed: ${error.message}`,
        data: null,
      };
    }
  }
}
