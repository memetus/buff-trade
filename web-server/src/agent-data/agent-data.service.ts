import { TradingResult } from './../common/schemas/trading-result.schema';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BondingCurveService } from 'src/bonding-curve/bonding-curve.service';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Portfolio } from 'src/common/schemas/portfolio.schema';
import { Token } from 'src/common/schemas/token.schema';
import { CONSTANTS } from 'src/common/config/constants';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AgentDataService {
  constructor(
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,
    @InjectModel('TradingResult')
    private tradingResultModel: Model<TradingResult>,
    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,
    @InjectModel('Token')
    private tokenModel: Model<Token>,

    private bondingCurveService: BondingCurveService,
    private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleUpdateMarketCap() {
    console.log('Updating market cap...');
    this.updateMarketCap();
  }

  async updateMarketCap() {
    const fundDataInfo = await this.fundDataModel.find().lean();
    const poolAddresses = fundDataInfo.map((fund) => fund.bondingCurvePool);

    const marketCapInfo =
      await this.bondingCurveService.getMarketCaps(poolAddresses);

    // Update marketCapBefore for each fund
    const updatePromises = fundDataInfo.map((fund, index) => {
      return this.fundDataModel.findOneAndUpdate(
        { bondingCurvePool: fund.bondingCurvePool },
        { marketCapBefore: Math.floor(marketCapInfo[index]) },
        { new: true },
      );
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      message: 'Market cap updated successfully',
    };
  }

  async getTrending(
    page: number,
    pageSize: number,
    sort?: string,
    sortOrder?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;
    let sortField: string;
    switch (sort) {
      case 'graduated':
        sortField = 'isMigrated';
        break;
      case 'totalPnL':
        sortField = 'totalPnl';
        break;
      case 'age':
        sortField = 'createdAt';
        break;
      case 'topMc':
        sortField = 'marketCapBefore';
        break;
      default:
        sortField = 'marketCapBefore';
    }

    let fundDataInfo;
    let totalCount;

    // Special handling for topMc sort: show positive totalPnL first
    if (sort === 'topMc') {
      [fundDataInfo, totalCount] = await Promise.all([
        this.fundDataModel.aggregate([
          {
            $addFields: {
              isProfitable: { $cond: [{ $gt: ['$totalPnl', 0] }, 1, 0] },
            },
          },
          {
            $sort: {
              isProfitable: -1,
              marketCapBefore: sortOrder === 'asc' ? 1 : -1,
            },
          },
          { $skip: skip },
          { $limit: limit },
        ]),
        this.fundDataModel.countDocuments(),
      ]);
    } else {
      [fundDataInfo, totalCount] = await Promise.all([
        this.fundDataModel
          .find({})
          .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.fundDataModel.countDocuments(),
      ]);
    }

    // Get bonding curve pools and fetch market caps
    const poolAddresses = fundDataInfo.map((fund) => fund.bondingCurvePool);
    const fundIds = fundDataInfo.map((fund) => fund._id.toString());

    const [topPortfolios, latestTradingResults, marketCaps] = await Promise.all(
      [
        this.portfolioModel.aggregate([
          { $match: { fundId: { $in: fundIds } } },
          { $sort: { totalPnl: -1 } },
          {
            $group: {
              _id: '$fundId',
              portfolios: {
                $push: {
                  symbol: '$symbol',
                  totalPnl: { $round: ['$totalPnl', 2] },
                },
              },
            },
          },
          {
            $project: {
              _id: 1,
              portfolios: { $slice: ['$portfolios', 2] },
            },
          },
        ]),
        this.tradingResultModel.aggregate([
          { $match: { fundId: { $in: fundIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$fundId',
              latestTrade: {
                $first: {
                  symbol: '$symbol',
                  type: '$recommendation',
                  solAmount: '$solAmount',
                },
              },
            },
          },
        ]),
        this.bondingCurveService.getMarketCaps(poolAddresses),
      ],
    );

    // Create maps for quick lookup
    const portfolioMap = new Map();
    topPortfolios.forEach((item) => {
      portfolioMap.set(item._id, item.portfolios);
    });

    const tradingResultMap = new Map();
    latestTradingResults.forEach((item) => {
      tradingResultMap.set(item._id, item.latestTrade);
    });

    // Create market cap map
    const marketCapMap = new Map();
    fundDataInfo.forEach((fund, index) => {
      marketCapMap.set(
        fund.bondingCurvePool,
        Math.floor(marketCaps[index] || 0),
      );
    });

    return {
      totalCount,
      results: fundDataInfo.map((fund) => {
        const currentMarketCap = marketCapMap.get(fund.bondingCurvePool) || 0;
        const previousMarketCap = fund.marketCapBefore || 0;

        // Calculate market cap change percentage
        const marketCapChangePercent =
          previousMarketCap === 0
            ? 0
            : parseFloat(
                (
                  ((currentMarketCap - previousMarketCap) / previousMarketCap) *
                  100
                ).toFixed(2),
              );

        // Calculate total PnL change percentage from totalPnLHistory
        const currentTotalPnL = fund.totalPnl;
        const previousTotalPnL =
          fund.totalPnLHistory && fund.totalPnLHistory.length >= 2
            ? fund.totalPnLHistory[fund.totalPnLHistory.length - 2].value
            : 0;

        const totalPnLChangePercent =
          previousTotalPnL === 0
            ? 0
            : parseFloat(
                (
                  ((currentTotalPnL - previousTotalPnL) / previousTotalPnL) *
                  100
                ).toFixed(2),
              );

        return {
          fundId: fund._id.toString(),
          imageUrl: fund.imageUrl,
          name: fund.name,
          ticker: fund.ticker,
          website: fund.website,
          twitter: fund.twitter,
          telegram: fund.telegram,
          totalPnL: parseFloat(fund.totalPnl.toFixed(2)),
          totalPnLChangePercent,
          marketCap: currentMarketCap,
          marketCapChangePercent,
          isMigrated: fund.isMigrated,
          tokenAddress: fund.tokenAddress,
          bondingCurvePool: fund.bondingCurvePool,
          dammV2Pool: fund.dammV2Pool,
          createdAt: fund.createdAt,
          latestTrade: tradingResultMap.get(fund._id.toString()) || null,
          topPortfolios: portfolioMap.get(fund._id.toString()) || [],
        };
      }),
    };
  }

  async getAiDashboard(
    page: number,
    pageSize: number,
    sort?: string,
    sortOrder?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    // Set sort conditions
    const sortQuery: any = { isRealTrading: -1 }; // Sort to show realTrading=true items first

    if (sort && sortOrder) {
      // Add secondary sort condition
      let sortField: string;
      switch (sort) {
        case 'realized':
          sortField = 'realizedProfit';
          break;
        case 'unrealized':
          sortField = 'unRealizedProfit';
          break;
        case 'totalPnL':
          sortField = 'totalPnl';
          break;
        case 'nav':
          sortField = 'nav';
          break;
        case 'age':
          sortField = 'createdAt';
          break;
        default:
          sortField = sort;
      }

      // sortField가 기존 키와 다른 경우에만 추가
      if (
        sortField &&
        sortField !== 'isRealTrading' &&
        !sortQuery.hasOwnProperty(sortField)
      ) {
        sortQuery[sortField] = sortOrder === 'asc' ? 1 : -1;
      }
    }

    // First get fund data and total count
    const [fundDataInfo, totalCount] = await Promise.all([
      this.fundDataModel
        .find(
          {},
          {
            _id: 1,
            name: 1,
            imageUrl: 1,
            movieUrl: 1,
            category: 1,
            generation: 1,
            strategyPrompt: 1,
            nav: 1,
            realizedProfit: 1,
            unRealizedProfit: 1,
            totalPnl: 1,
            isSurvived: 1,
            isRealTrading: 1,
            bondingCurvePool: 1,
            dammV2Pool: 1,
            createdAt: 1,
          },
        )
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.fundDataModel.countDocuments(),
    ]);

    // Get token information, latest trading results, and top portfolio for the fetched funds
    const fundIds = fundDataInfo.map((fund) => fund._id.toString());
    const [tokens, latestTradingResults, topPortfolios] = await Promise.all([
      fundIds.length > 0
        ? this.tokenModel.find({ fundId: { $in: fundIds } }).lean()
        : Promise.resolve([]),
      fundIds.length > 0
        ? this.tradingResultModel.aggregate([
            { $match: { fundId: { $in: fundIds } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$fundId',
                latestTrade: { $first: '$$ROOT' },
              },
            },
          ])
        : Promise.resolve([]),
      fundIds.length > 0
        ? this.portfolioModel.aggregate([
            { $match: { fundId: { $in: fundIds } } },
            { $sort: { totalPnl: -1 } },
            {
              $group: {
                _id: '$fundId',
                topPortfolios: { $push: '$$ROOT' },
              },
            },
            {
              $project: {
                _id: 1,
                topPortfolios: { $slice: ['$topPortfolios', 2] },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const tokenInfoMap = new Map();
    const tradingResultMap = new Map();
    const portfolioMap = new Map();

    tokens.forEach((token) => {
      tokenInfoMap.set(token.fundId, token);
    });

    latestTradingResults.forEach((result) => {
      tradingResultMap.set(result._id, result.latestTrade);
    });

    topPortfolios.forEach((result) => {
      portfolioMap.set(result._id, result.topPortfolios);
    });

    // 병렬로 marketCap 조회 최적화
    const marketCapPromises = fundDataInfo.map(async (fund) => {
      const tokenInfo = tokenInfoMap.get(fund._id.toString());
      let marketCap = 0;

      if (tokenInfo?.bondingCurvePool) {
        try {
          marketCap = await this.bondingCurveService.getMarketCap(
            tokenInfo.bondingCurvePool,
          );
        } catch (error) {
          console.error(
            `Error getting market cap for fund ${fund._id}:`,
            error.message || error,
          );
        }
      }

      return {
        fundId: fund._id.toString(),
        marketCap: marketCap > 0 ? parseFloat(marketCap.toFixed(2)) : 0,
      };
    });

    const marketCapResults = await Promise.all(marketCapPromises);
    const marketCapMap = new Map(
      marketCapResults.map((result) => [result.fundId, result.marketCap]),
    );

    // 결과 조합 (marketCap 조회 완료 후)
    const results = fundDataInfo.map((fund) => {
      const tokenInfo = tokenInfoMap.get(fund._id.toString());
      const latestTrade = tradingResultMap.get(fund._id.toString());
      const topPortfolios = portfolioMap.get(fund._id.toString());
      const marketCap = marketCapMap.get(fund._id.toString()) || 0;

      return {
        fundId: fund._id.toString(),
        imageUrl: fund.imageUrl,
        name: fund.name,
        ticker: fund.ticker,
        marketCap,
        isMigrated: tokenInfo?.isMigrated || false,
        tokenAddress: tokenInfo?.tokenAddress || null,
        bondingCurvePool: fund.bondingCurvePool || null,
        dammV2Pool: fund.dammV2Pool || null,
        // Latest trading result information
        latestTrade: latestTrade
          ? {
              symbol: latestTrade.symbol,
              type: latestTrade.recommendation,
              solAmount: latestTrade.solAmount,
            }
          : null,
        // Top portfolio information (top 2 highest totalPnL)
        topPortfolios:
          topPortfolios && topPortfolios.length > 0
            ? topPortfolios.map((portfolio) => ({
                symbol: portfolio.symbol,
                totalPnl: parseFloat(portfolio.totalPnl.toFixed(2)),
              }))
            : [],
        totalPnL: parseFloat(fund.totalPnl.toFixed(2)),
        createdAt: fund.createdAt,
      };
    });

    return {
      totalCount,
      results,
    };
  }

  async getAiDashboardByFundId(fundId: string) {
    const fundDataInfo = await this.fundDataModel.findById(fundId);
    if (!fundDataInfo) {
      throw new BadRequestException('fund not found');
    }

    const topPics = await this.portfolioModel
      .find({
        fundId: fundDataInfo._id,
        totalPnl: {
          $exists: true,
          $nin: [null],
        },
      })
      .sort({ totalPnl: -1 })
      .limit(2)
      .select('symbol totalPnl')
      .lean();

    return {
      fundId: fundDataInfo._id,
      name: fundDataInfo.name,
      imageUrl: fundDataInfo.imageUrl,
      generation: fundDataInfo.generation,
      strategyPrompt: fundDataInfo.strategyPrompt,
      nav: parseFloat(fundDataInfo.nav.toFixed(2)),
      realizedProfit: parseFloat(fundDataInfo.realizedProfit.toFixed(2)),
      unrealizedProfit: parseFloat(fundDataInfo.unRealizedProfit.toFixed(2)),
      totalPnL: parseFloat(fundDataInfo.totalPnl.toFixed(2)),
      topPics: topPics.map((item) => ({
        token: item.symbol,
        totalPnL: parseFloat(item.totalPnl.toFixed(2)),
      })),
      survived: fundDataInfo.isRunning,
      realTrading: fundDataInfo.isRealTrading,
    };
  }

  async getTrendingTokens(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    // First get fund data and total count
    const [fundDataInfo] = await Promise.all([
      this.fundDataModel
        .find(
          {
            totalPnl: { $gt: 0 },
          },
          {
            _id: 1,
            name: 1,
            imageUrl: 1,
            ticker: 1,
            totalPnl: 1,
            createdAt: 1,
          },
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Get token information, latest trading results, and top portfolio for the fetched funds
    const fundIds = fundDataInfo.map((fund) => fund._id.toString());
    const [tokens, latestTradingResults, topPortfolios] = await Promise.all([
      fundIds.length > 0
        ? this.tokenModel.find({ fundId: { $in: fundIds } }).lean()
        : Promise.resolve([]),
      fundIds.length > 0
        ? this.tradingResultModel.aggregate([
            { $match: { fundId: { $in: fundIds } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: '$fundId',
                latestTrade: { $first: '$$ROOT' },
              },
            },
          ])
        : Promise.resolve([]),
      fundIds.length > 0
        ? this.portfolioModel.aggregate([
            { $match: { fundId: { $in: fundIds } } },
            { $sort: { totalPnl: -1 } },
            {
              $group: {
                _id: '$fundId',
                topPortfolios: { $push: '$$ROOT' },
              },
            },
            {
              $project: {
                _id: 1,
                topPortfolios: { $slice: ['$topPortfolios', 2] },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const tokenInfoMap = new Map();
    const tradingResultMap = new Map();
    const portfolioMap = new Map();

    tokens.forEach((token) => {
      tokenInfoMap.set(token.fundId, token);
    });

    latestTradingResults.forEach((result) => {
      tradingResultMap.set(result._id, result.latestTrade);
    });

    topPortfolios.forEach((result) => {
      portfolioMap.set(result._id, result.topPortfolios);
    });

    // 병렬로 marketCap 조회 최적화
    const marketCapPromises = fundDataInfo.map(async (fund) => {
      const tokenInfo = tokenInfoMap.get(fund._id.toString());
      let marketCap = 0;

      if (tokenInfo?.bondingCurvePool) {
        try {
          marketCap = await this.bondingCurveService.getMarketCap(
            tokenInfo.bondingCurvePool,
          );
        } catch (error) {
          console.error(
            `Error getting market cap for fund ${fund._id}:`,
            error.message || error,
          );
        }
      }

      return {
        fundId: fund._id.toString(),
        marketCap: marketCap > 0 ? parseFloat(marketCap.toFixed(2)) : 0,
      };
    });

    const marketCapResults = await Promise.all(marketCapPromises);
    const marketCapMap = new Map(
      marketCapResults.map((result) => [result.fundId, result.marketCap]),
    );

    // 결과 조합 (marketCap 조회 완료 후)
    const results = fundDataInfo.map((fund) => {
      const tokenInfo = tokenInfoMap.get(fund._id.toString());
      const latestTrade = tradingResultMap.get(fund._id.toString());
      const topPortfolios = portfolioMap.get(fund._id.toString());
      const marketCap = marketCapMap.get(fund._id.toString()) || 0;

      return {
        fundId: fund._id.toString(),
        imageUrl: fund.imageUrl,
        name: fund.name,
        ticker: fund.ticker,
        marketCap,
        isMigrated: tokenInfo?.isMigrated || false,
        tokenAddress: tokenInfo?.tokenAddress || null,
        // Latest trading result information
        latestTrade: latestTrade
          ? {
              symbol: latestTrade.symbol,
              type: latestTrade.recommendation,
              solAmount: latestTrade.solAmount,
            }
          : null,
        // Top portfolio information (top 2 highest totalPnL)
        topPortfolios:
          topPortfolios && topPortfolios.length > 0
            ? topPortfolios.map((portfolio) => ({
                symbol: portfolio.symbol,
                totalPnl: parseFloat(portfolio.totalPnl.toFixed(2)),
              }))
            : [],
        totalPnL: parseFloat(fund.totalPnl.toFixed(2)),
        createdAt: fund.createdAt,
      };
    });

    return {
      totalCount: results.length,
      results,
    };
  }

  async getSearchTopPics(search: string) {
    const results = await this.portfolioModel.aggregate([
      {
        $match: {
          symbol: { $regex: search, $options: 'i' },
          totalPnl: {
            $exists: true,
            $type: 'number',
          },
        },
      },
      {
        $addFields: {
          fundObjectId: { $toObjectId: '$fundId' },
        },
      },
      {
        $lookup: {
          from: 'funddatas',
          localField: 'fundObjectId',
          foreignField: '_id',
          as: 'fund',
        },
      },
      { $unwind: { path: '$fund', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          fundId: '$fundId',
          token: '$symbol',
          address: '$tokenAddress',
          category: '$fund.category',
          totalPnL: '$totalPnl',
          strategyPrompt: '$fund.strategyPrompt',
          imageUrl: '$fund.imageUrl',
          fundName: '$fund.name',
        },
      },
      { $sort: { totalPnl: -1 } },
    ]);

    const coinPriceInfo = await this.coinPriceModel
      .find({
        address: { $in: results.map((item) => item.address) },
      })
      .select('address name symbol imageThumbUrl')
      .lean();

    return {
      totalCount: results.length,
      results: results.map((item) => ({
        fundId: item.fundId?.toString() || '',
        token: item.token || '',
        address: item.address || '',
        category: item.category || '',
        totalPnL: parseFloat((item.totalPnL || 0).toFixed(2)),
        strategyPrompt: item.strategyPrompt || '',
        imageUrl:
          coinPriceInfo.find((coin) => coin.address === item.address)
            ?.imageThumbUrl || '',
        fundName: item.fundName || '',
      })),
    };
  }

  async getAiMetaData(fundId: string) {
    const fundDataInfo = await this.fundDataModel.findById(fundId);

    if (!fundDataInfo) {
      throw new BadRequestException('token not found');
    }

    const marketCap = await this.bondingCurveService.getMarketCap(
      fundDataInfo.bondingCurvePool,
    );

    return {
      fundId: fundDataInfo._id.toString(),
      imageUrl: fundDataInfo.imageUrl,
      name: fundDataInfo.name,
      ticker: fundDataInfo.ticker,
      creator: fundDataInfo.creator,
      tokenAddress: fundDataInfo.tokenAddress,
      marketCap,
      isMigrated: fundDataInfo.isMigrated,
      website: fundDataInfo.website,
      twitter: fundDataInfo.twitter,
      telegram: fundDataInfo.telegram,
      strategy: fundDataInfo.strategyPrompt,
    };
  }

  async getAgentCardByFundId(fundId: string) {
    const fundDataInfo = await this.fundDataModel.findById(fundId).lean();

    const marketCap = await this.bondingCurveService.getMarketCap(
      fundDataInfo.bondingCurvePool,
    );

    const progressToMigration =
      await this.bondingCurveService.getProgressToMigration(
        fundDataInfo.bondingCurvePool,
      );

    const coinPriceInfo = await this.coinPriceModel.findOne({
      address: 'So11111111111111111111111111111111111111112',
    });
    const solPriceUSD = coinPriceInfo.priceUSD;
    const targetMarketCap =
      CONSTANTS.MIGRATION_THRESHOLD * parseFloat(solPriceUSD);

    return {
      fundId: fundId,
      imageUrl: fundDataInfo.imageUrl,
      ticker: fundDataInfo.ticker,
      name: fundDataInfo.name,
      website: fundDataInfo.website,
      twitter: fundDataInfo.twitter,
      telegram: fundDataInfo.telegram,
      createdAt: fundDataInfo.createdAt,
      marketCapProgress: parseFloat(
        parseFloat(progressToMigration.toString()).toFixed(2),
      ),
      marketCap: parseFloat(marketCap.toFixed(2)),
      targetMarketCap: parseFloat(targetMarketCap.toFixed(2)),
      tokenAddress: fundDataInfo.tokenAddress,
      creator: fundDataInfo.creator,
      nav: parseFloat(fundDataInfo.nav.toFixed(2)),
      realizedProfit: parseFloat(fundDataInfo.realizedProfit.toFixed(2)),
      unrealizedProfit: parseFloat(fundDataInfo.unRealizedProfit.toFixed(2)),
    };
  }

  async getAgentStatByFundId(fundId: string) {
    const fundDataInfo = await this.fundDataModel.findById(fundId).lean();

    return {
      fundId: fundId,
      imageUrl: fundDataInfo.imageUrl,
      generation: fundDataInfo.generation,
      nav: parseFloat(fundDataInfo.nav.toFixed(2)),
      realizedProfit: parseFloat(fundDataInfo.realizedProfit.toFixed(2)),
      unrealizedProfit: parseFloat(fundDataInfo.unRealizedProfit.toFixed(2)),
      totalPnL: parseFloat(fundDataInfo.totalPnl.toFixed(2)),
      createdAt: fundDataInfo.createdAt,
    };
  }

  async getActivityByFundId(fundId: string, page: number, pageSize: number) {
    const tradingResultInfo = await this.tradingResultModel
      .find({ fundId })
      .sort({ createdAt: 1 });

    if (!tradingResultInfo) {
      throw new BadRequestException('fund not found');
    }

    const tokenMap = new Map<
      string,
      { totalAmount: number; totalPurchaseCost: number }
    >();

    const resultsWithPriceInfo = await Promise.all(
      tradingResultInfo.map(async (result) => {
        let profit = null;

        if (!tokenMap.has(result.tokenAddress)) {
          tokenMap.set(result.tokenAddress, {
            totalAmount: 0,
            totalPurchaseCost: 0,
          });
        }

        const tokenData = tokenMap.get(result.tokenAddress);

        if (result.recommendation === 'BUY') {
          // 매수
          tokenData.totalAmount += result.tokenAmount;
          tokenData.totalPurchaseCost += result.priceSol * result.tokenAmount;
        } else if (result.recommendation === 'SELL') {
          // 매도
          const averagePurchasePrice =
            tokenData.totalPurchaseCost / tokenData.totalAmount;
          const profitPercentage =
            ((result.priceSol - averagePurchasePrice) / averagePurchasePrice) *
            100;
          profit = parseFloat(profitPercentage.toFixed(2));
          tokenData.totalAmount -= result.tokenAmount;
          tokenData.totalPurchaseCost -=
            averagePurchasePrice * result.tokenAmount;
        }

        const totalPnL = profit !== null ? profit : 0;

        return {
          type: result.recommendation.toLowerCase(),
          token: result.symbol,
          address: result.tokenAddress,
          txHash: result.txHash,
          total: parseFloat((result.solAmount + totalPnL).toFixed(2)),
          profit: profit,
          yaps: result.analysis,
          createdAt: result.createdAt,
        };
      }),
    );

    resultsWithPriceInfo.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const paginatedResults = resultsWithPriceInfo.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    return {
      totalCount: resultsWithPriceInfo.length,
      results: paginatedResults,
    };
  }

  async getHoldingsByFundId(
    fundId: string,
    page: number,
    pageSize: number,
    sort?: string,
    sortOrder?: string,
  ) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    // 정렬 조건 설정
    let sortQuery = {};
    if (sort && sortOrder) {
      const direction = sortOrder === 'asc' ? 1 : -1;
      if (sort === 'realized') {
        sortQuery = { realizedProfitSol: direction };
      } else if (sort === 'unrealized') {
        sortQuery = { unRealizedProfitSol: direction };
      } else if (sort === 'totalPnL') {
        sortQuery = { totalPnl: direction };
      } else if (sort === 'nav') {
        sortQuery = { nav: direction };
      }
    }

    const [portfolioData, totalCount] = await Promise.all([
      this.portfolioModel
        .find({ fundId, status: 'HOLD' })
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.portfolioModel.countDocuments({ fundId, status: 'HOLD' }),
    ]);

    const results = portfolioData.map((item) => ({
      token: item.symbol,
      address: item.tokenAddress,
      realizedProfit: parseFloat(item.realizedProfitSol.toFixed(2)),
      unrealizedProfit: parseFloat(item.unRealizedProfitSol.toFixed(2)),
      totalPnL: parseFloat(item.totalPnl.toFixed(2)),
      nav: parseFloat(item.nav.toFixed(2)),
    }));

    return {
      totalCount,
      results,
    };
  }

  async getRealTradingGraphByFundId(fundId: string) {
    const fundDataInfo = await this.fundDataModel.findById(fundId).lean();

    if (!fundDataInfo) {
      throw new BadRequestException('fund not found');
    }

    return (
      fundDataInfo.totalPnLHistory?.map((item) => ({
        value:
          typeof item.value === 'number'
            ? parseFloat(item.value.toFixed(2))
            : 0,
        timestamp: item.timestamp,
      })) || []
    );
  }

  async getTopPicsByFundId(fundId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const [portfolioInfo, totalCount] = await Promise.all([
      this.portfolioModel
        .find({ fundId, status: 'HOLD' })
        .sort({ totalPnl: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.portfolioModel.countDocuments({ fundId, status: 'HOLD' }),
    ]);

    const coinPriceInfo = await this.coinPriceModel
      .find({
        address: { $in: portfolioInfo.map((item) => item.tokenAddress) },
      })
      .select('address name symbol imageThumbUrl')
      .lean();

    return {
      totalCount,
      results: portfolioInfo.map((item) => ({
        token: item.symbol,
        address: item.tokenAddress,
        totalPnL: parseFloat(item.totalPnl.toFixed(2)),
        imageUrl:
          coinPriceInfo.find((coin) => coin.address === item.tokenAddress)
            ?.imageThumbUrl || '',
      })),
    };
  }

  private async getFundCounts(fundDataInfo: any[]) {
    const fundIds = fundDataInfo.map((item) => item._id.toString());

    const [portfolioInfoByFund, tradingResultInfoByFund] = await Promise.all([
      // Calculate portfolio count for each fundId
      this.portfolioModel.aggregate([
        {
          $match: {
            fundId: { $in: fundIds },
            status: 'HOLD',
          },
        },
        {
          $group: {
            _id: '$fundId',
            portfolioCount: { $sum: 1 },
          },
        },
      ]),
      // Calculate trading result count for each fundId
      this.tradingResultModel.aggregate([
        {
          $match: {
            fundId: { $in: fundIds },
          },
        },
        {
          $group: {
            _id: '$fundId',
            tradingResultCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Create portfolio count map with fundId as key
    const portfolioCountMap = portfolioInfoByFund.reduce((map, item) => {
      map[item._id.toString()] = item.portfolioCount;
      return map;
    }, {});

    // Create trading result count map with fundId as key
    const tradingResultCountMap = tradingResultInfoByFund.reduce(
      (map, item) => {
        map[item._id.toString()] = item.tradingResultCount;
        return map;
      },
      {},
    );

    return { portfolioCountMap, tradingResultCountMap };
  }

  async getMarketCap() {
    const poolAddress = '7LqJ4bGwoUPVh4xJeWnx6UHGwJgGyN2pHwwBiCf35pvT';
    return this.bondingCurveService.getMarketCap(poolAddress);
  }

  async getHoldersByFundId(fundId: string) {
    try {
      const fundData = await this.fundDataModel
        .findById(fundId)
        .select('tokenAddress');

      if (!fundData || !fundData.tokenAddress) {
        throw new Error('Fund not found or token address not available');
      }

      const tokenAddress = fundData.tokenAddress;

      // Validate token address
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error('Invalid token address provided');
      }

      // Get Helius API key from config
      const heliusApiKey = this.configService.get<string>(
        'ai-agent.heliusApiKey',
      );
      if (!heliusApiKey) {
        throw new Error('Helius API key not configured');
      }

      const rpcUrl =
        CONSTANTS.SOLANA_ENDPOINT === 'mainnet-beta'
          ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
          : `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getTokenLargestAccounts',
          params: [tokenAddress],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      const totalSupply = 1000000000; // Fixed total supply
      const holders = data.result?.value || [];

      // Get wallet addresses for token accounts
      const holdersWithWalletAddresses = await Promise.all(
        holders.map(async (holder) => {
          try {
            // Get token account info to find the owner (wallet address)
            const accountResponse = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: '1',
                method: 'getAccountInfo',
                params: [
                  holder.address,
                  {
                    encoding: 'jsonParsed',
                  },
                ],
              }),
            });

            const accountData = await accountResponse.json();
            const walletAddress =
              accountData.result?.value?.data?.parsed?.info?.owner ||
              holder.address;

            const holderAmount = holder.uiAmount || 0;
            const percentage =
              totalSupply > 0 ? (holderAmount / totalSupply) * 100 : 0;

            return {
              address: walletAddress, // 실제 wallet address 사용
              percentage: parseFloat(percentage.toFixed(6)),
            };
          } catch (error) {
            console.error(
              `Error getting wallet for token account ${holder.address}:`,
              error,
            );
            // 실패시 원래 주소 사용
            const holderAmount = holder.uiAmount || 0;
            const percentage =
              totalSupply > 0 ? (holderAmount / totalSupply) * 100 : 0;

            return {
              address: holder.address,
              percentage: parseFloat(percentage.toFixed(6)),
            };
          }
        }),
      );

      return {
        status: 'success',
        message: 'Token holders retrieved successfully',
        data: {
          holders: holdersWithWalletAddresses,
          totalHolders: holdersWithWalletAddresses.length,
        },
      };
    } catch (error) {
      console.error('Error getting token holders:', error);
      return {
        status: 'error',
        message: `Failed to get token holders: ${error.message}`,
        data: null,
      };
    }
  }

  async getTransactionsByFundId(
    fundId: string,
    page: number,
    pageSize: number,
  ) {
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    try {
      const fundData = await this.fundDataModel
        .findById(fundId)
        .select('tokenAddress');

      if (!fundData || !fundData.tokenAddress) {
        throw new Error('Fund not found or token address not available');
      }

      const tokenAddress = fundData.tokenAddress;

      const heliusApiKey = this.configService.get<string>(
        'ai-agent.heliusApiKey',
      );
      if (!heliusApiKey) {
        throw new Error('Helius API key not configured');
      }

      const url = `${CONSTANTS.HELIUS_API_BASE_URL}/v0/addresses/${tokenAddress}/transactions?api-key=${heliusApiKey}&limit=100`;

      const response = await fetch(url + `&offset=${skip}`);

      if (!response.ok) {
        throw new Error(
          `Enhanced Transactions API error! status: ${response.status}`,
        );
      }

      const responseData = await response.json();

      // Handle different response structures
      const transactions = responseData.transactions || responseData || [];
      const totalTransactions = responseData.total || transactions.length;

      // Apply pagination to the transactions array
      const paginatedTransactions = Array.isArray(transactions)
        ? transactions.slice(skip, skip + limit)
        : [];

      // Process transactions to extract swap information - SIMPLIFIED VERSION
      const swapHistory = paginatedTransactions
        .map((tx) => {
          // Skip transactions that don't involve our token
          const hasTargetToken =
            tx.tokenTransfers &&
            tx.tokenTransfers.some((t) => t.mint === tokenAddress);
          if (!hasTargetToken) {
            return null;
          }

          // Use feePayer as userAccount (signer)
          const userAccount = tx.feePayer;
          if (!userAccount) {
            return null;
          }

          // Get target token transfer
          const targetTokenTransfer = tx.tokenTransfers.find(
            (t) => t.mint === tokenAddress,
          );
          if (!targetTokenTransfer) {
            return null;
          }

          // Determine BUY/SELL based on token transfer direction
          let swapType = 'UNKNOWN';
          const tokenAmount = targetTokenTransfer.tokenAmount || 0;
          let solAmount = 0;

          // If feePayer received the token = BUY
          if (targetTokenTransfer.toUserAccount === userAccount) {
            swapType = 'BUY';
          }
          // If feePayer sent the token = SELL
          else if (targetTokenTransfer.fromUserAccount === userAccount) {
            swapType = 'SELL';
          }

          // Get SOL amount from native transfers
          if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
            const maxSolTransfer = tx.nativeTransfers.reduce(
              (max, transfer) =>
                transfer.amount > max ? transfer.amount : max,
              0,
            );
            solAmount = parseFloat((maxSolTransfer / 1000000000).toFixed(9));
          }

          // Return transaction if it's a valid BUY/SELL
          if (
            swapType !== 'UNKNOWN' &&
            userAccount &&
            (tokenAmount > 0 || solAmount > 0)
          ) {
            return {
              type: swapType,
              userAccount: userAccount,
              solAmount: solAmount,
              tokenAmount: tokenAmount,
              timestamp: new Date(tx.timestamp * 1000).toISOString(),
              signature: tx.signature,
            };
          }

          return null; // Skip invalid transactions
        })
        .filter(Boolean);

      return {
        transactions: swapHistory,
        totalTransactions: totalTransactions,
        page: page,
        pageSize: pageSize,
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return {
        status: 'error',
        message: `Failed to get transactions: ${error.message}`,
        data: null,
      };
    }
  }
}
