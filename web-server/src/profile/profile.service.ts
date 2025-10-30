import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BondingCurveService } from 'src/bonding-curve/bonding-curve.service';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Users } from 'src/common/schemas/users.schema';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel('Users')
    private usersModel: Model<Users>,
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,

    private bondingCurveService: BondingCurveService,
    private configService: ConfigService,
  ) {}

  async getProfile(userId: string) {
    const userInfo = await this.usersModel.findById(userId);

    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    return userInfo;
  }

  async getBalance(userId: string) {
    const userInfo = await this.usersModel.findById(userId);

    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    const heliusApiKey = this.configService.get<string>(
      'ai-agent.heliusApiKey',
    );
    if (!heliusApiKey) {
      throw new Error('Helius API key not configured');
    }

    const walletAddress = userInfo.wallet;

    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'search-assets-balance',
            method: 'searchAssets',
            params: {
              ownerAddress: walletAddress,
              tokenType: 'fungible',
              displayOptions: {
                showNativeBalance: true,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Helius API error: ${data.error.message}`);
      }

      const result = data.result;
      const tokens = [];
      const tokenAddresses = [];

      for (const item of result.items) {
        tokenAddresses.push(item.id);
      }

      for (const item of result.items) {
        const tokenInfo = item.token_info;
        const content = item.content;

        const rawBalance = tokenInfo?.balance || 0;
        const decimals = tokenInfo?.decimals || 0;
        const balance = rawBalance / Math.pow(10, decimals);

        tokens.push({
          tokenAddress: item.id,
          ticker: tokenInfo?.symbol || 'Unknown',
          name: content?.metadata?.name || tokenInfo?.symbol || 'Unknown Token',
          balance: balance,
          imageUrl: content?.files?.[0]?.uri || null,
          value: 0, // Token price not available yet
        });
      }

      const solBalance = result.nativeBalance?.lamports
        ? result.nativeBalance.lamports / 1e9
        : 0;

      let solValue = 0;
      let solPriceUSD = 0;
      try {
        const solPrice = await this.coinPriceModel.findOne({
          address: 'So11111111111111111111111111111111111111112',
        });

        if (solPrice) {
          solPriceUSD = parseFloat(solPrice.priceUSD);
          solValue = solBalance * solPriceUSD;
        }
      } catch (error) {
        console.warn('Failed to fetch SOL price:', error);
      }

      const totalValue =
        tokens.reduce((sum, token) => sum + token.value, 0) + solValue;

      return {
        userId: userInfo._id.toString(),
        wallet: walletAddress,
        nativeBalance: {
          symbol: 'SOL',
          balance: solBalance,
          price: solPriceUSD,
          value: solValue,
        },
        tokens: tokens,
        totalTokens: tokens.length,
        totalPortfolioValue: totalValue,
        summary: {
          solValue: solValue,
          tokensValue: tokens.reduce((sum, token) => sum + token.value, 0),
          totalValue: totalValue,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch wallet balance: ${error.message}`);
    }
  }

  async getToken(userId: string) {
    const userInfo = await this.usersModel.findById(userId);

    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    const fundDataInfo = await this.fundDataModel.find({
      creator: userInfo.wallet,
    });

    const creatorFeeInfo = await this.bondingCurveService.getPoolsFeesByCreator(
      userInfo.wallet,
    );

    // Create a map of pool addresses to fee info for quick lookup
    const feeMap = new Map();
    creatorFeeInfo.forEach((feeInfo) => {
      feeMap.set(feeInfo.poolAddress.toString(), {
        creatorQuoteFee: feeInfo.creatorQuoteFee.toNumber(),
        totalTradingQuoteFee: feeInfo.totalTradingQuoteFee.toNumber(),
      });
    });

    const solPrice = await this.coinPriceModel.findOne({
      address: 'So11111111111111111111111111111111111111112',
    });

    const solPriceUSD = solPrice ? parseFloat(solPrice.priceUSD) : 0;

    // Get all market caps at once
    const poolAddresses = fundDataInfo.map((item) => item.bondingCurvePool);
    const marketCaps =
      await this.bondingCurveService.getMarketCaps(poolAddresses);

    // Create a map of pool addresses to market caps
    const marketCapMap = new Map();
    poolAddresses.forEach((address, index) => {
      marketCapMap.set(address, marketCaps[index] || 0);
    });

    const tokenInfoList = fundDataInfo.map((item) => {
      const feeInfo = feeMap.get(item.bondingCurvePool);
      // Convert lamports to USD: (lamports / 1e9) * solPriceUSD
      const unclaimedRewardsUSD = feeInfo?.creatorQuoteFee
        ? (feeInfo.creatorQuoteFee / 1e9) * solPriceUSD
        : 0;
      const totalRewardsUSD = feeInfo?.totalTradingQuoteFee
        ? (feeInfo.totalTradingQuoteFee / 2 / 1e9) * solPriceUSD
        : 0;

      return {
        marketCap: marketCapMap.get(item.bondingCurvePool) || 0,
        ticker: item.ticker,
        name: item.name,
        imageUrl: item.imageUrl,
        address: item.tokenAddress,
        agentPnL: item.totalPnl,
        unclaimedRewards: parseFloat(unclaimedRewardsUSD.toFixed(2)),
        totalRewards: parseFloat(totalRewardsUSD.toFixed(2)),
        poolAddress: item.bondingCurvePool,
        unclaimedRewardsLamports: feeInfo?.creatorQuoteFee,
      };
    });

    return {
      totalUnclaimedRewards: parseFloat(
        tokenInfoList
          .reduce((sum, token) => sum + token.unclaimedRewards, 0)
          .toFixed(2),
      ),
      totalRewards: parseFloat(
        tokenInfoList
          .reduce((sum, token) => sum + token.totalRewards, 0)
          .toFixed(2),
      ),
      tokenInfoList,
    };
  }
}
