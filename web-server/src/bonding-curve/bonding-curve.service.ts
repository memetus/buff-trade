import {
  DynamicBondingCurveClient,
  PoolService,
  CreatorService,
  PartnerService,
  deriveDammV2PoolAddress,
  getPriceFromSqrtPrice,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Cluster,
} from '@solana/web3.js';

import * as BN from 'bn.js';
import bs58 from 'bs58';
import { CONSTANTS } from 'src/common/config/constants';
import { InjectModel } from '@nestjs/mongoose';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { Model } from 'mongoose';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BondingCurveService {
  private connection: Connection;
  private client: DynamicBondingCurveClient;
  private poolService: PoolService;
  private creatorService: CreatorService;
  private partnerService: PartnerService;
  private payer: Keypair;
  private partner: Keypair;

  constructor(
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,

    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,

    private readonly configService: ConfigService,
  ) {
    this.initBondingCurve();
  }

  // Getter methods for external services
  getClient(): DynamicBondingCurveClient {
    return this.client;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getPayer(): Keypair {
    return this.payer;
  }

  getPartner(): Keypair {
    return this.partner;
  }

  getPoolService(): PoolService {
    return this.poolService;
  }

  getCreatorService(): CreatorService {
    return this.creatorService;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleMigration() {
    await this.runMigration();
  }

  async runMigration() {
    const result = await this.getPoolsInfoFromFundData();
    if (!result || (result as any).success === false) {
      console.warn(
        'runMigration skipped: failed to fetch pools info from FundData',
      );
      return;
    }

    const pools = (result as any).poolsInfo || [];
    if (!Array.isArray(pools) || pools.length === 0) {
      console.log('runMigration: no pools to process');
      return;
    }

    for (const pool of pools) {
      try {
        const poolAddress: string = pool?.poolAddress;
        const info = pool?.poolInfo;
        if (!poolAddress || !info) {
          continue;
        }

        const isMigrated: boolean = !!info.isMigrated;
        const migrationProgress: number = Number(info.migrationProgress ?? 0);
        if (!isMigrated && migrationProgress === 3) {
          const config = info.config?.toString?.() ?? String(info.config);
          if (!config) {
            console.warn(
              `runMigration: missing config for pool ${poolAddress}`,
            );
            continue;
          }

          await this.createDammV2MigrationMetadata(poolAddress, config);
          await this.migrateToDammV2(poolAddress);

          const dammV2PoolAddress =
            await this.getDammV2PoolAddress(poolAddress);
          if (dammV2PoolAddress.success) {
            await this.fundDataModel.updateOne(
              { bondingCurvePool: poolAddress },
              {
                dammV2Pool: dammV2PoolAddress.dammV2PoolAddress,
                migratedAt: new Date(),
              },
            );
          }
        }
      } catch (e) {
        console.error('runMigration: error processing pool', {
          poolAddress: pool?.poolAddress,
          error: (e as any).message || e,
        });
      }
    }
  }

  private initBondingCurve() {
    try {
      this.connection = new Connection(
        clusterApiUrl(CONSTANTS.SOLANA_ENDPOINT as Cluster),
        'confirmed',
      );
      this.client = DynamicBondingCurveClient.create(this.connection);

      // Initialize PoolService, CreatorService, and PartnerService
      this.poolService = new PoolService(this.connection, 'confirmed');
      this.creatorService = new CreatorService(this.connection, 'confirmed');
      this.partnerService = new PartnerService(this.connection, 'confirmed');

      // Payer wallet
      const base58PrivateKey1 = this.configService.get('ai-agent.payerKey');
      const secretKeyBytes1 = bs58.decode(base58PrivateKey1);
      this.payer = Keypair.fromSecretKey(secretKeyBytes1);

      // Partner wallet
      const base58PrivateKey2 = this.configService.get('ai-agent.partnerKey');
      const secretKeyBytes2 = bs58.decode(base58PrivateKey2);
      this.partner = Keypair.fromSecretKey(secretKeyBytes2);

      console.log('Bonding Curve service initialization completed:', {
        rpcUrl: this.connection.rpcEndpoint,
        payerPublicKey: this.payer.publicKey.toString(),
        partnerPublicKey: this.partner.publicKey.toString(),
        poolServiceInitialized: !!this.poolService,
        creatorServiceInitialized: !!this.creatorService,
      });
    } catch (error) {
      console.error('Error occurred during SDK initialization:', error.message);
      throw error;
    }
  }

  async getConfigInfo(configAddress: string) {
    try {
      const configInfo = await this.client.state.getPoolConfig(configAddress);
      return configInfo;
    } catch (error) {
      console.error(
        'Error occurred during Config information retrieval:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve Config information.',
      };
    }
  }

  async getPoolInfo(poolAddress: string) {
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

      const poolInfo = await this.client.state.getPool(poolPublicKey);

      console.log(poolInfo.sqrtPrice.toString());

      const tokenPrice = getPriceFromSqrtPrice(poolInfo.sqrtPrice, 6, 9);
      console.log(tokenPrice.toString());

      // SOL 가격 조회
      const solPrice = await this.coinPriceModel.findOne({
        address: 'So11111111111111111111111111111111111111112',
      });
      const solPriceUSD = solPrice.priceUSD; // SOL 1개당 USD 가격

      // tokenPrice를 number로 변환 (BN에서 number로)
      const tokenPriceNumber = tokenPrice.toNumber();
      const tokenPriceUSD = tokenPriceNumber * parseFloat(solPriceUSD);
      const marketCap = tokenPriceUSD * 1000000000;
      console.log('Token Price (SOL):', tokenPriceNumber);
      console.log('Token Price (USD):', tokenPriceUSD);

      return {
        success: true,
        poolInfo,
        tokenPrice: tokenPriceNumber,
        tokenPriceUSD,
        marketCap,
        message: 'Pool information has been successfully retrieved.',
      };
    } catch (error) {
      console.error(
        'Error occurred during Pool information retrieval:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve Pool information.',
      };
    }
  }

  async getPoolsInfo(poolsAddresses: string[]) {
    try {
      // SOL 가격 조회
      const solPrice = await this.coinPriceModel.findOne({
        address: 'So11111111111111111111111111111111111111112',
      });

      const solPriceUSD = solPrice.priceUSD;

      // getPools 대신 개별 풀 정보를 병렬로 가져오기
      const poolPromises = poolsAddresses.map(async (address) => {
        try {
          const poolPublicKey = new PublicKey(address);
          const poolInfo = await this.client.state.getPool(poolPublicKey);

          const tokenPrice = getPriceFromSqrtPrice(poolInfo.sqrtPrice, 6, 9);
          const tokenPriceUSD = tokenPrice.toNumber() * parseFloat(solPriceUSD);
          const marketCap = tokenPriceUSD * 1000000000;

          return {
            poolAddress: address,
            poolInfo,
            tokenPrice,
            tokenPriceUSD,
            marketCap,
          };
        } catch (error) {
          return {
            poolAddress: address,
            error: error.message,
          };
        }
      });

      const poolsWithPrice = await Promise.all(poolPromises);

      return {
        success: true,
        poolsInfo: poolsWithPrice,
        message: 'Pools information has been successfully retrieved.',
      };
    } catch (error) {
      // 에러 처리
      console.error(
        'Error occurred during Pools information retrieval:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve Pools information.',
      };
    }
  }

  async getPoolsInfoFromFundData() {
    try {
      const fundDataInfo = await this.fundDataModel
        .find({}, { bondingCurvePool: 1 })
        .lean();
      const addresses = Array.from(
        new Set(
          (fundDataInfo || [])
            .map((doc: any) => doc?.bondingCurvePool)
            .filter(
              (addr: string) => typeof addr === 'string' && addr.length >= 32,
            ),
        ),
      );

      if (addresses.length === 0) {
        return {
          success: true,
          poolsInfo: [],
          message: 'No bondingCurvePool addresses found in FundData.',
        };
      }

      return await this.getPoolsInfo(addresses);
    } catch (error) {
      console.error('Error collecting pools from FundData:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to collect pools info from FundData.',
      };
    }
  }

  async getProgressToMigration(poolAddress: string) {
    try {
      const poolInfo =
        await this.client.state.getPoolCurveProgress(poolAddress);
      return poolInfo.toString();
    } catch (error) {
      console.error(
        'Error occurred during Progress to Migration retrieval:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve Progress to Migration information.',
      };
    }
  }

  async getMarketCap(poolAddress: string) {
    try {
      const coinPriceInfo = await this.coinPriceModel.findOne({
        address: 'So11111111111111111111111111111111111111112',
      });

      if (!coinPriceInfo) {
        console.warn(
          `SOL price info not found, returning 0 for pool ${poolAddress}`,
        );
        return 0;
      }

      const solPriceUSD = coinPriceInfo.priceUSD;

      const poolInfo = await this.client.state.getPool(poolAddress);

      if (!poolInfo) {
        console.warn(`Pool info not found for ${poolAddress}, returning 0`);
        return 0;
      }

      const tokenPrice = getPriceFromSqrtPrice(poolInfo.sqrtPrice, 6, 9);

      const tokenPriceUSD = tokenPrice.toNumber() * parseFloat(solPriceUSD);
      const marketCap = tokenPriceUSD * 1000000000;

      return marketCap;
    } catch (error) {
      console.error(
        `Error in getMarketCap for pool ${poolAddress}:`,
        (error as any).message || error,
      );
      return 0;
    }
  }

  async getMarketCaps(poolAddresses: string[]) {
    try {
      if (poolAddresses.length === 0) {
        return [];
      }

      // Get SOL price once (optimization: single DB query instead of N queries)
      const coinPriceInfo = await this.coinPriceModel.findOne({
        address: 'So11111111111111111111111111111111111111112',
      });

      if (!coinPriceInfo) {
        console.warn('SOL price info not found, returning zeros');
        return poolAddresses.map(() => 0);
      }

      const solPriceUSD = parseFloat(coinPriceInfo.priceUSD);

      // Fetch all pool info in parallel (SDK limitation: must use individual calls)
      const poolInfos = await Promise.all(
        poolAddresses.map(async (poolAddress) => {
          try {
            const poolInfo = await this.client.state.getPool(poolAddress);
            return poolInfo;
          } catch (error) {
            console.warn(`Failed to get pool info for ${poolAddress}:`, error);
            return null;
          }
        }),
      );

      // Calculate market caps
      const marketCaps = poolInfos.map((poolInfo) => {
        if (!poolInfo) {
          return 0;
        }

        try {
          const tokenPrice = getPriceFromSqrtPrice(poolInfo.sqrtPrice, 6, 9);
          const tokenPriceUSD = tokenPrice.toNumber() * solPriceUSD;
          const marketCap = tokenPriceUSD * 1000000000;
          return marketCap;
        } catch (error) {
          console.warn('Error calculating market cap:', error);
          return 0;
        }
      });

      return marketCaps;
    } catch (error) {
      console.error('Error getting market caps:', error.message);
      return poolAddresses.map(() => 0);
    }
  }
  // Migration Methods
  async createLocker(poolAddress: string) {
    try {
      const poolPublicKey = new PublicKey(poolAddress);

      // Check if locker already exists by trying to get pool info
      try {
        const poolInfo = await this.client.state.getPool(poolPublicKey);
        if (poolInfo.isMigrated) {
          return {
            success: true,
            message: 'Pool is already migrated, locker may not be needed.',
          };
        }
      } catch (error) {
        // Continue with locker creation
      }

      const transaction = await this.client.migration.createLocker({
        payer: this.partner.publicKey, // Partner가 payer 역할
        virtualPool: poolPublicKey,
      });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.partner.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.partner], // Partner가 서명
        { commitment: 'confirmed' },
      );

      return {
        success: true,
        signature,
        message: 'Locker created successfully.',
      };
    } catch (error) {
      console.error('Error creating locker:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create locker.',
      };
    }
  }

  async withdrawLeftover(poolAddress: string) {
    try {
      const poolPublicKey = new PublicKey(poolAddress);

      const transaction = await this.client.migration.withdrawLeftover({
        payer: this.partner.publicKey, // Partner가 payer 역할
        virtualPool: poolPublicKey,
      });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.partner.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.partner], // Partner가 서명
        { commitment: 'confirmed' },
      );

      return {
        success: true,
        signature,
        message: 'Leftover withdrawn successfully.',
      };
    } catch (error) {
      console.error('Error withdrawing leftover:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to withdraw leftover.',
      };
    }
  }

  async createDammV2MigrationMetadata(
    poolAddress: string,
    configAddress: string,
  ) {
    try {
      const poolPublicKey = new PublicKey(poolAddress);
      const configPublicKey = new PublicKey(configAddress);

      const transaction =
        await this.client.migration.createDammV2MigrationMetadata({
          payer: this.partner.publicKey, // Partner가 payer 역할
          virtualPool: poolPublicKey,
          config: configPublicKey,
        });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.partner.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.partner], // Partner가 서명
        { commitment: 'confirmed' },
      );

      return {
        success: true,
        signature,
        message: 'DAMM V2 migration metadata created successfully.',
      };
    } catch (error) {
      console.error(
        'Error creating DAMM V2 migration metadata:',
        error.message,
      );
      return {
        success: false,
        error: error.message,
        message: 'Failed to create DAMM V2 migration metadata.',
      };
    }
  }

  async migrateToDammV2(poolAddress: string) {
    try {
      const dammConfigAddress = CONSTANTS.DAMM_CONFIG_ADDRESS;
      const poolPublicKey = new PublicKey(poolAddress);
      const dammConfigPublicKey = new PublicKey(dammConfigAddress);

      // Check if pool is already migrated
      const poolInfo = await this.client.state.getPool(poolPublicKey);
      if (poolInfo.isMigrated) {
        return {
          success: false,
          error: 'Pool is already migrated to DAMM V2',
          message: 'This pool has already been migrated.',
        };
      }

      const migrationResponse = await this.client.migration.migrateToDammV2({
        payer: this.partner.publicKey, // Partner가 payer 역할
        virtualPool: poolPublicKey,
        dammConfig: dammConfigPublicKey,
      });

      // Extract transaction from response
      const transaction = migrationResponse.transaction;

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.partner.publicKey;

      // Add required signers
      const signers = [
        this.partner, // Partner가 서명
        migrationResponse.firstPositionNftKeypair,
        migrationResponse.secondPositionNftKeypair,
      ];

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        signers,
        { commitment: 'confirmed' },
      );

      console.log('Migration response:', migrationResponse);
      // Get the migrated pool address from the migration response
      const migratedPoolAddress =
        (migrationResponse as any).migratedPool?.toString() || poolAddress;

      return {
        success: true,
        signature,
        originalPoolAddress: poolAddress,
        migratedPoolAddress: migratedPoolAddress,
        message: 'Migration to DAMM V2 completed successfully.',
      };
    } catch (error) {
      console.error('Error migrating to DAMM V2:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to migrate to DAMM V2.',
      };
    }
  }

  async getDammV2PoolAddress(poolAddress: string) {
    try {
      const poolPublicKey = new PublicKey(poolAddress);
      const poolConfig = await this.client.state.getPool(poolPublicKey);

      const dammConfigAddress = CONSTANTS.DAMM_CONFIG_ADDRESS;
      const dammConfig = new PublicKey(dammConfigAddress);
      console.log(dammConfig);

      const tokenAMintPk = new PublicKey((poolConfig as any).baseMint);
      const tokenBMintPk = new PublicKey((poolConfig as any).quoteMint);

      const dammV2PoolAddress = deriveDammV2PoolAddress(
        dammConfig,
        tokenAMintPk,
        tokenBMintPk,
      );

      return {
        success: true,
        dammV2PoolAddress: dammV2PoolAddress.toString(),
        migrationFeeOption: 2,
      };
    } catch (error) {
      console.error(
        'Error getting DAMM V2 pool address:',
        (error as any).message || error,
      );
      return {
        success: false,
        error: (error as any).message || String(error),
        message: 'Failed to get DAMM V2 pool address.',
      };
    }
  }

  async getTradingFeeInfo(poolAddress: string) {
    try {
      const poolPublicKey = new PublicKey(poolAddress);
      const poolInfo =
        await this.client.state.getPoolFeeBreakdown(poolPublicKey);
      return poolInfo;
    } catch (error) {
      console.error('Error getting trading fee info:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get trading fee info.',
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

  async claimCreatorTradingFee(poolAddress: string) {
    try {
      // Convert pool address string to PublicKey
      let poolPublicKey: PublicKey;
      try {
        poolPublicKey = new PublicKey(poolAddress);
      } catch (error) {
        throw new BadRequestException(
          `Invalid pool address format: ${poolAddress}`,
        );
      }

      const poolsFees = await this.getPoolsFeesByCreator(
        this.payer.publicKey.toString(),
      );

      const poolFeeInfo = poolsFees.find((pool: any) => {
        const poolAddr =
          pool.poolAddress?.toString() || pool.pool?.toString() || '';
        return poolAddr === poolAddress;
      });

      if (!poolFeeInfo) {
        throw new BadRequestException(
          `No claimable fees found for pool: ${poolAddress}. Available pools: ${poolsFees.map((p: any) => p.poolAddress?.toString() || p.pool?.toString()).join(', ')}`,
        );
      }

      const maxBaseAmount = poolFeeInfo.creatorBaseFee || new BN(0);
      const maxQuoteAmount = poolFeeInfo.creatorQuoteFee || new BN(0);

      console.log('Starting creator trading fee claim:', {
        pool: poolPublicKey.toString(),
        creator: this.payer.publicKey.toString(),
        maxBaseAmount: maxBaseAmount.toString(),
        maxQuoteAmount: maxQuoteAmount.toString(),
        receiver: this.payer.publicKey.toString(),
      });

      // Check if there are any fees to claim
      if (maxBaseAmount.isZero() && maxQuoteAmount.isZero()) {
        return {
          success: false,
          message: 'No fees available to claim for this pool.',
          pool: poolAddress,
          creator: this.payer.publicKey.toString(),
        };
      }

      const transaction = await this.creatorService.claimCreatorTradingFee({
        creator: this.payer.publicKey, // Creator who will claim the fee
        payer: this.payer.publicKey, // Creator pays for the transaction
        pool: poolPublicKey,
        maxBaseAmount: maxBaseAmount,
        maxQuoteAmount: maxQuoteAmount,
        receiver: this.payer.publicKey, // Creator receives the fee
        tempWSolAcc: null, // Optional temporary wrapped SOL account
      });

      // Set latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.payer.publicKey;

      // Sign and send transaction with creator's keypair
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.payer], // Creator (payer) signs the transaction
        { commitment: 'confirmed' },
      );

      console.log('Creator trading fee claimed successfully:', signature);

      return {
        success: true,
        signature,
        pool: poolAddress,
        creator: this.payer.publicKey.toString(),
        baseFeesClaimed: maxBaseAmount.toString(),
        quoteFeesClaimed: maxQuoteAmount.toString(),
        message: 'Creator trading fee has been successfully claimed.',
      };
    } catch (error) {
      console.error('Error claiming creator trading fee:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to claim creator trading fee.',
      };
    }
  }

  async claimPartnerTradingFee(poolAddress: string) {
    try {
      const poolsFees = await this.getPoolsFeesByCreator(
        this.payer.publicKey.toString(),
      );

      const poolFeeInfo = poolsFees.find((pool: any) => {
        const poolAddr =
          pool.poolAddress?.toString() || pool.pool?.toString() || '';
        return poolAddr === poolAddress;
      });

      if (!poolFeeInfo) {
        throw new BadRequestException(
          `No claimable fees found for pool: ${poolAddress}. Available pools: ${poolsFees.map((p: any) => p.poolAddress?.toString() || p.pool?.toString()).join(', ')}`,
        );
      }

      const maxBaseAmount = poolFeeInfo.partnerBaseFee || new BN(0);
      const maxQuoteAmount = poolFeeInfo.partnerQuoteFee || new BN(0);

      const poolPublicKey = new PublicKey(poolAddress);
      const transaction = await this.partnerService.claimPartnerTradingFee({
        pool: poolPublicKey,
        feeClaimer: this.partner.publicKey,
        payer: this.partner.publicKey,
        maxBaseAmount: maxBaseAmount,
        maxQuoteAmount: maxQuoteAmount,
      });

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.partner],
        { commitment: 'confirmed' },
      );

      return {
        success: true,
        signature,
        pool: poolAddress,
        partner: this.partner.publicKey.toString(),
        baseFeesClaimed: maxBaseAmount.toString(),
        quoteFeesClaimed: maxQuoteAmount.toString(),
        message: 'Partner trading fee has been successfully claimed.',
      };
    } catch (error) {
      console.error('Error claiming partner trading fee:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to claim partner trading fee.',
      };
    }
  }
}
