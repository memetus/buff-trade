import {
  buildCurve,
  CreatorService,
  DynamicBondingCurveClient,
  PoolService,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as BN from 'bn.js';
import {
  MigrationOption,
  TokenDecimal,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  TokenType,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { BondingCurveService } from 'src/bonding-curve/bonding-curve.service';
import { CreateTokenDto } from 'src/token/dto/req.dto';
import { NATIVE_MINT } from '@solana/spl-token';

@Injectable()
export class DevService {
  private client: DynamicBondingCurveClient;
  private connection: Connection;
  private poolService: PoolService;
  private creatorService: CreatorService;
  private payer: Keypair;
  private partner: Keypair;

  constructor(
    private readonly bondingCurveService: BondingCurveService,
    private readonly configService: ConfigService,
  ) {
    this.client = this.bondingCurveService.getClient();
    this.connection = this.bondingCurveService.getConnection();
    this.poolService = this.bondingCurveService.getPoolService();
    this.creatorService = this.bondingCurveService.getCreatorService();
    this.payer = this.bondingCurveService.getPayer();
    this.partner = this.bondingCurveService.getPartner();
  }

  create(data: CreateTokenDto, file: Express.Multer.File) {
    console.log(file);
    return data;
  }

  async checkSdkConnection() {
    try {
      const version = await this.connection.getVersion();
      const slot = await this.connection.getSlot();

      return {
        isConnected: true,
        solanaVersion: version,
        currentSlot: slot,
        rpcEndpoint: this.connection.rpcEndpoint,
        commitment: this.connection.commitment,
        clientInitialized: !!this.client,
        testWalletAddress: this.payer.publicKey.toString(),
      };
    } catch (error) {
      console.error(
        'Error occurred while checking SDK connection:',
        error.message,
      );
      return {
        isConnected: false,
        error: error.message,
        rpcEndpoint: this.connection?.rpcEndpoint || 'unknown',
        clientInitialized: !!this.client,
      };
    }
  }

  async checkWalletBalance() {
    try {
      const balance = await this.connection.getBalance(this.payer.publicKey);

      return {
        success: true,
        walletAddress: this.payer.publicKey.toString(),
        balanceSOL: balance / LAMPORTS_PER_SOL,
        balanceLamports: balance,
        message: `Current balance: ${balance / LAMPORTS_PER_SOL} SOL`,
      };
    } catch (error) {
      console.error(
        'Error occurred while checking wallet balance:',
        error.message,
      );
      return {
        success: false,
        message: 'Failed to check wallet balance',
        error: error.message,
      };
    }
  }

  async createBondingCurveWithPool() {
    try {
      // Generate new token mint (baseMint must be newly created according to SDK docs)
      const mintKeypair = Keypair.generate();
      const mintPublicKey = mintKeypair.publicKey;

      // Use provided address for creator (but payer handles signing)
      let creatorPublicKey: PublicKey;
      let partnerPublicKey: PublicKey;
      try {
        creatorPublicKey = new PublicKey(this.payer.publicKey.toString());
        partnerPublicKey = new PublicKey(this.partner.publicKey.toString());
      } catch (error) {
        throw new BadRequestException(
          `Invalid creatorAddress format: ${this.payer.publicKey.toString()} - ${error.message}`,
        );
      }

      console.log('Starting Bonding Curve and Pool creation:', {
        mint: mintPublicKey.toString(),
        creator: creatorPublicKey.toString(),
        partner: partnerPublicKey.toString(),
      });

      // Set buildCurve parameters
      const buildCurveParams = {
        totalTokenSupply: 1000000000,
        migrationOption: MigrationOption.MET_DAMM_V2,
        tokenBaseDecimal: TokenDecimal.SIX,
        tokenQuoteDecimal: TokenDecimal.NINE,
        percentageSupplyOnMigration: 20,
        migrationQuoteThreshold: 85,
        lockedVestingParam: {
          totalLockedVestingAmount: 0,
          numberOfVestingPeriod: 0,
          cliffUnlockAmount: 0,
          totalVestingDuration: 0,
          cliffDurationFromMigrationTime: 0,
        },
        baseFeeParams: {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 200,
            endingFeeBps: 200,
            numberOfPeriod: 0,
            totalDuration: 0,
          },
        },
        dynamicFeeEnabled: false,
        activationType: ActivationType.Slot,
        collectFeeMode: CollectFeeMode.QuoteToken,
        migrationFeeOption: MigrationFeeOption.FixedBps200,
        tokenType: TokenType.SPL,
        partnerLpPercentage: 0,
        creatorLpPercentage: 0,
        partnerLockedLpPercentage: 50,
        creatorLockedLpPercentage: 50,
        creatorTradingFeePercentage: 50,
        leftover: 1000,
        tokenUpdateAuthority: 0,
        migrationFee: {
          feePercentage: 10,
          creatorFeePercentage: 0,
        },
      };

      // Use SDK's buildCurve function (cast to any for type compatibility)
      const curveConfig = buildCurve(buildCurveParams as any);

      // Simple method using createConfigAndPool
      const configKeypair = Keypair.generate();
      // Quote mint (SOL) - use NATIVE_MINT
      const quoteMint = NATIVE_MINT;

      let createResult;
      try {
        console.log('Calling createConfigAndPool...');
        createResult = await this.poolService.createConfigAndPool({
          payer: this.payer.publicKey,
          config: configKeypair.publicKey,
          feeClaimer: this.partner.publicKey,
          leftoverReceiver: this.partner.publicKey,
          quoteMint: quoteMint,
          ...curveConfig,
          preCreatePoolParam: {
            baseMint: mintPublicKey,
            name: 'Real Test Token',
            symbol: 'REST',
            uri: 'https://dev-proto-launch.s3.ap-northeast-2.amazonaws.com/Token/250831-094129-1.png',
            poolCreator: this.payer.publicKey,
            authority: this.payer.publicKey,
          },
        });
        console.log('createConfigAndPool call completed');
      } catch (createError) {
        console.error('createConfigAndPool error:', createError);
        throw new BadRequestException(
          `Pool creation failed: ${createError.message}`,
        );
      }

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      createResult.recentBlockhash = blockhash;
      createResult.feePayer = this.payer.publicKey;

      // Sign transaction with required keypairs
      createResult.partialSign(this.payer, configKeypair, mintKeypair);

      // Use sendAndConfirmTransaction (combines send and confirm)
      const signature = await sendAndConfirmTransaction(
        this.connection,
        createResult,
        [this.payer, configKeypair, mintKeypair],
        { commitment: 'confirmed' },
      );

      let poolAddress: PublicKey;
      try {
        poolAddress = deriveDbcPoolAddress(
          quoteMint,
          mintPublicKey,
          configKeypair.publicKey,
        );
      } catch (deriveError) {
        console.error(
          'Error occurred during Pool address calculation:',
          deriveError.message,
        );
        throw new BadRequestException(
          `Pool address calculation failed: ${deriveError.message}`,
        );
      }

      return {
        success: true,
        bondingCurve: poolAddress.toString(),
        pool: poolAddress.toString(),
        mint: mintPublicKey.toString(),
        configAddress: configKeypair.publicKey.toString(),
        transaction: signature,
        curveConfig,
        message: 'Bonding Curve and Pool have been successfully created.',
      };
    } catch (error) {
      console.error(
        'Error occurred during Bonding Curve and Pool creation:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to create Bonding Curve and Pool.',
      };
    }
  }

  async buyTokens(poolAddress: string, solAmount: number) {
    try {
      // Input validation
      if (
        !poolAddress ||
        typeof poolAddress !== 'string' ||
        poolAddress.length < 32
      ) {
        throw new BadRequestException(`Invalid poolAddress: ${poolAddress}`);
      }

      let poolPublicKey: PublicKey;
      try {
        poolPublicKey = new PublicKey(poolAddress);
      } catch (error) {
        throw new BadRequestException(
          `Invalid poolAddress format: ${poolAddress} - ${error.message}`,
        );
      }
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

      // Check pool status before swapping
      const poolInfo = await this.client.state.getPool(poolPublicKey);
      if (poolInfo.isMigrated) {
        throw new BadRequestException(
          'This pool has been migrated to DAMM V2 and is no longer available for trading. Please use the migrated pool instead.',
        );
      }

      console.log('Starting token purchase:', {
        pool: poolPublicKey.toString(),
        solAmount,
        lamports,
        poolStatus: {
          isMigrated: poolInfo.isMigrated,
          migrationProgress: poolInfo.migrationProgress?.toString(),
        },
      });

      // Use PoolService swap method
      const swapTx = await this.poolService.swap({
        pool: poolPublicKey,
        amountIn: new BN(lamports),
        minimumAmountOut: new BN(0),
        swapBaseForQuote: false, // false for SOL(quote) -> Token(base)
        owner: this.payer.publicKey,
        payer: this.payer.publicKey,
        referralTokenAccount: null, // No referral
      });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      swapTx.recentBlockhash = blockhash;
      swapTx.feePayer = this.payer.publicKey;

      // Use sendAndConfirmTransaction (combines send and confirm)
      const swapSignature = await sendAndConfirmTransaction(
        this.connection,
        swapTx,
        [this.payer],
        { commitment: 'confirmed' },
      );

      const swapResult = {
        transaction: swapTx,
        signature: swapSignature,
        tokensReceived: solAmount * 1000, // Estimated token amount (actual calculation needed)
      };

      console.log('Token purchase completed:', swapResult);

      return {
        success: true,
        transaction: (swapResult as any).transaction || 'tx_id',
        signature: (swapResult as any).signature || 'signature',
        tokensReceived: (swapResult as any).tokensReceived || solAmount * 1000,
        message: `Token purchase with ${solAmount} SOL has been completed.`,
      };
    } catch (error) {
      console.error('Error occurred during token purchase:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to purchase tokens.',
      };
    }
  }

  async sellTokens(poolAddress: string, tokenAmount: number) {
    try {
      // Input validation
      if (
        !poolAddress ||
        typeof poolAddress !== 'string' ||
        poolAddress.length < 32
      ) {
        throw new BadRequestException(`Invalid poolAddress: ${poolAddress}`);
      }

      let poolPublicKey: PublicKey;
      try {
        poolPublicKey = new PublicKey(poolAddress);
      } catch (error) {
        throw new BadRequestException(
          `Invalid poolAddress format: ${poolAddress} - ${error.message}`,
        );
      }

      // Convert token amount to smallest unit (considering 6 decimals)
      const tokenAmountInSmallestUnit = Math.floor(
        tokenAmount * Math.pow(10, 6),
      );

      // Check pool status before swapping
      const poolInfo = await this.client.state.getPool(poolPublicKey);
      if (poolInfo.isMigrated) {
        throw new BadRequestException(
          'This pool has been migrated to DAMM V2 and is no longer available for trading. Please use the migrated pool instead.',
        );
      }

      console.log('Starting token sale:', {
        pool: poolPublicKey.toString(),
        tokenAmount,
        tokenAmountInSmallestUnit,
        poolStatus: {
          isMigrated: poolInfo.isMigrated,
          migrationProgress: poolInfo.migrationProgress?.toString(),
        },
      });

      // Use PoolService swap method (sell)
      const swapTx = await this.poolService.swap({
        pool: poolPublicKey,
        amountIn: new BN(tokenAmountInSmallestUnit),
        minimumAmountOut: new BN(0),
        swapBaseForQuote: true, // true for Token(base) -> SOL(quote)
        owner: this.payer.publicKey,
        payer: this.payer.publicKey,
        referralTokenAccount: null, // No referral
      });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      swapTx.recentBlockhash = blockhash;
      swapTx.feePayer = this.payer.publicKey;

      // Use sendAndConfirmTransaction (combines send and confirm)
      const swapSignature = await sendAndConfirmTransaction(
        this.connection,
        swapTx,
        [this.payer],
        { commitment: 'confirmed' },
      );

      const swapResult = {
        transaction: swapTx,
        signature: swapSignature,
        solReceived: tokenAmount / 1000, // Estimated SOL amount (actual calculation needed)
      };

      console.log('Token sale completed:', swapResult);

      return {
        success: true,
        transaction: (swapResult as any).transaction || 'tx_id',
        signature: (swapResult as any).signature || 'signature',
        solReceived: (swapResult as any).solReceived || tokenAmount / 1000,
        message: `Sale of ${tokenAmount} tokens has been completed.`,
      };
    } catch (error) {
      console.error('Error occurred during token sale:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to sell tokens.',
      };
    }
  }

  async getPoolsFeesByCreator(creatorAddress: string) {
    try {
      const pools =
        await this.client.state.getPoolsFeesByCreator(creatorAddress);
      return pools;
    } catch (error) {
      console.error('Error getting pools fees by creator:', error.message);
    }
  }
}
