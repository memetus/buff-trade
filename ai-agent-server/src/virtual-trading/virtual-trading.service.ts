import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgentService } from 'src/agent/agent.service';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Portfolio } from 'src/common/schemas/portfolio.schema';
import { TradingResult } from 'src/common/schemas/trading-result.schema';
import * as fs from 'fs';
import * as path from 'path';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class VirtualTradingService {
  constructor(
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,

    @InjectModel('TradingResult')
    private tradingResultModel: Model<TradingResult>,

    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,

    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,

    private readonly agentService: AgentService,
  ) {}

  private getTestRecommendation() {
    const testFilePath = path.join(process.cwd(), 'test.json');
    const testData = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));

    console.log(testData);
    return testData;
  }

  @Cron('0 * * * *')
  async handleVirtualTrading() {
    await this.executeVirtualTrading();
  }

  async executeVirtualTrading() {
    const fundDataInfo = await this.checkRunningFunds();
    if (fundDataInfo.length === 0) {
      console.log('No running funds found');
      return;
    }

    console.log(`Virtual trading started for ${fundDataInfo.length} funds`);

    const results = [];
    const batchSize = 3;
    for (let i = 0; i < fundDataInfo.length; i += batchSize) {
      const batch = fundDataInfo.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (fundData) => {
          const result = await this.tradeByAgent(fundData._id.toString());
          return {
            fundId: fundData._id.toString(),
            fundName: fundData.name,
            ...result,
          };
        }),
      );
      results.push(...batchResults);
    }

    return {
      success: true,
      message: 'Virtual trading completed for all funds',
      results,
    };
  }

  private async checkRunningFunds() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await this.fundDataModel.updateMany(
      {
        isRunning: true,
        isRealTrading: false,
        $or: [
          {
            isMigrated: false,
            createdAt: { $lt: oneMonthAgo },
          },
          {
            isMigrated: true,
            migratedAt: { $lt: threeMonthsAgo },
          },
        ],
      },
      {
        $set: { isRunning: false },
      },
    );

    const runningFunds = await this.fundDataModel
      .find({
        isRunning: true,
        isRealTrading: false,
        $or: [
          {
            isMigrated: false,
            createdAt: { $gte: oneMonthAgo },
          },
          {
            isMigrated: true,
            migratedAt: { $gte: threeMonthsAgo },
          },
        ],
      })
      .lean();

    return runningFunds;
  }

  async tradeByAgent(fundId: string) {
    const recommendationInfo =
      await this.agentService.getRecommendation(fundId);

    // const recommendationInfo = this.getTestRecommendation();

    if (recommendationInfo) {
      await this.tradeByRecommendation(fundId, recommendationInfo);
    }

    return recommendationInfo;
  }

  async tradeByRecommendation(fundId: string, recommendationInfo: any) {
    const fundData = await this.fundDataModel.findById(fundId);
    if (!fundData) return null;

    // 🔥 AUTO-FIX: Clean up corrupted portfolios before trading
    await this.fixCorruptedPortfolios(fundId);

    const results = [];
    let totalSolChange = 0;
    let remainingSolBalance = fundData.solBalance;

    for (const coin of recommendationInfo.coins) {
      // Validate token address
      if (
        !coin.address ||
        coin.address === 'placeholder_address' ||
        coin.address.length < 32 ||
        coin.address.length > 44 ||
        !/^[1-9A-HJ-NP-Za-km-z]+$/.test(coin.address)
      ) {
        console.error(
          `Invalid Solana token address for ${coin.symbol}: ${coin.address}`,
        );
        continue;
      }

      // Get current coin price
      const coinPrice = await this.coinPriceModel.findOne({
        address: coin.address,
      });

      if (!coinPrice) {
        console.error(`No price data found for ${coin.symbol}`);
        continue;
      }

      const currentPrice = coinPrice.priceSol;

      // Validate price
      if (!currentPrice || currentPrice <= 0) {
        console.error(`Invalid price for ${coin.symbol}: ${currentPrice}`);
        continue;
      }

      // Dynamically adjust precision based on price decimal places
      const pricePrecision = Math.abs(Math.log10(currentPrice));
      const tokenPrecision = Math.max(6, Math.ceil(pricePrecision));

      // Skip if price is too small for practical trading
      if (currentPrice < 1e-12) {
        console.error(
          `Price too small for trading ${coin.symbol}: ${currentPrice}`,
        );
        continue;
      }

      const targetAllocation = (coin.allocation / 100) * fundData.nav;

      // Get current portfolio
      const portfolio = await this.portfolioModel.findOne({
        fundId,
        tokenAddress: coin.address,
      });

      let currentAllocation = 0;
      if (portfolio) {
        currentAllocation = (portfolio.allocation / 100) * fundData.nav;
        // Portfolio value will be calculated later from database
      }

      let tokenAmount = 0;
      let solAmount = 0;
      let tradeExecuted = false;

      if (
        coin.recommendation === 'buy' &&
        currentAllocation < targetAllocation
      ) {
        // Buy logic
        const buyAmount = targetAllocation - currentAllocation;
        tokenAmount = Number(
          (buyAmount / currentPrice).toFixed(tokenPrecision),
        );
        solAmount = Number(buyAmount.toFixed(6));

        // Skip if trade amount is too small
        if (solAmount < 0.000001) {
          console.log(
            `Trade amount too small for ${coin.symbol}: ${solAmount} SOL`,
          );
          continue;
        }

        // Check SOL balance
        if (remainingSolBalance < solAmount) {
          console.log(
            `Insufficient SOL balance for ${coin.symbol} buy. Required: ${solAmount}, Available: ${remainingSolBalance}`,
          );
          continue;
        }

        tradeExecuted = true;
        totalSolChange -= solAmount;
        remainingSolBalance -= solAmount;

        if (!portfolio) {
          // Create new portfolio
          await this.portfolioModel.create({
            fundId,
            symbol: coin.symbol,
            tokenAddress: coin.address,
            currentAmount: tokenAmount,
            allocation: coin.allocation,
            lastPriceSol: currentPrice,
            totalBuyAmount: tokenAmount,
            totalSellAmount: 0,
            totalBuySolAmount: solAmount,
            totalSellSolAmount: 0,
            averageBuyPriceSol: currentPrice,
            averageSellPriceSol: 0,
            realizedProfitSol: 0,
            unRealizedProfitSol: 0,
            totalPnl: 0,
            nav: tokenAmount * currentPrice,
            status: 'HOLD',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          // Portfolio value will be calculated from database
        } else {
          // Update existing portfolio
          const newAverageBuyPrice = Number(
            (
              (portfolio.totalBuySolAmount + solAmount) /
              (portfolio.totalBuyAmount + tokenAmount)
            ).toFixed(tokenPrecision),
          );

          const newNav = Number(
            ((portfolio.currentAmount + tokenAmount) * currentPrice).toFixed(6),
          );

          const netInvestment = Number(
            (
              portfolio.totalBuySolAmount +
              solAmount -
              portfolio.totalSellSolAmount
            ).toFixed(6),
          );
          const totalPnl = Number(
            (((newNav - netInvestment) / netInvestment) * 100).toFixed(6),
          );

          await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
            $inc: {
              currentAmount: tokenAmount,
              totalBuyAmount: tokenAmount,
              totalBuySolAmount: solAmount,
            },
            $set: {
              allocation: coin.allocation,
              lastPriceSol: currentPrice,
              averageBuyPriceSol: newAverageBuyPrice,
              nav: newNav,
              totalPnl: totalPnl,
              status: 'HOLD',
              updatedAt: new Date(),
            },
          });

          // Portfolio value will be calculated from database
        }

        // Save trading result
        await this.tradingResultModel.create({
          fundId,
          symbol: coin.symbol,
          tokenAddress: coin.address,
          recommendation: 'BUY',
          analysis: coin.analysis,
          allocation: coin.allocation,
          txHash: 'virtual',
          tokenAmount,
          solAmount,
          priceSol: currentPrice,
          createdAt: new Date(),
        });

        // Buy trades don't have realized profit
      } else if (
        coin.recommendation === 'sell' &&
        portfolio &&
        currentAllocation > targetAllocation
      ) {
        // Sell logic
        const sellAmount =
          coin.allocation === 0
            ? portfolio.currentAmount * currentPrice // Sell all tokens if allocation is 0
            : currentAllocation - targetAllocation; // Sell excess allocation otherwise

        tokenAmount =
          coin.allocation === 0
            ? portfolio.currentAmount // Sell all tokens if allocation is 0
            : Number((sellAmount / currentPrice).toFixed(tokenPrecision)); // Calculate from sellAmount otherwise

        // 🔥 CRITICAL FIX: Prevent selling more than current holdings
        if (tokenAmount > portfolio.currentAmount) {
          console.log(
            `Cannot sell ${tokenAmount} tokens of ${coin.symbol}. Only ${portfolio.currentAmount} available.`,
          );
          tokenAmount = portfolio.currentAmount; // Sell only what's available
          solAmount = Number((tokenAmount * currentPrice).toFixed(6));
        } else {
          solAmount = Number(sellAmount.toFixed(6));
        }

        // Skip if trade amount is too small
        if (solAmount < 0.000001 || tokenAmount <= 0) {
          console.log(
            `Trade amount too small for ${coin.symbol}: ${solAmount} SOL, ${tokenAmount} tokens`,
          );
          continue;
        }

        tradeExecuted = true;
        totalSolChange += solAmount;
        remainingSolBalance += solAmount;

        // Calculate remaining amount
        const remainingAmount = Math.max(
          0,
          portfolio.currentAmount - tokenAmount,
        );

        // Check if this is a full sell
        const isFullSell = coin.allocation === 0 || remainingAmount <= 0.000001;

        // Calculate realized profit ONLY for full sell
        const realizedProfit = isFullSell
          ? Number(
              (
                (currentPrice - portfolio.averageBuyPriceSol) *
                tokenAmount
              ).toFixed(tokenPrecision),
            )
          : 0;

        // Update average sell price
        const newAverageSellPrice = Number(
          (
            (portfolio.totalSellSolAmount + solAmount) /
            (portfolio.totalSellAmount + tokenAmount)
          ).toFixed(tokenPrecision),
        );

        // Calculate NAV and totalPnL
        let newNav, totalPnl;

        if (isFullSell) {
          // Full sell: NAV becomes 0, calculate final totalPnL
          newNav = 0;
          const totalInvestment = portfolio.totalBuySolAmount;
          const totalReturn = portfolio.totalSellSolAmount + solAmount;
          totalPnl = Number(
            (((totalReturn - totalInvestment) / totalInvestment) * 100).toFixed(
              6,
            ),
          );
          totalPnl = Math.max(totalPnl, -100);
        } else {
          // Partial sell: calculate remaining NAV and current totalPnL
          newNav = Number((remainingAmount * currentPrice).toFixed(6));
          const netInvestment = Number(
            (
              portfolio.totalBuySolAmount -
              (portfolio.totalSellSolAmount + solAmount)
            ).toFixed(6),
          );
          totalPnl =
            netInvestment > 0
              ? Number(
                  (((newNav - netInvestment) / netInvestment) * 100).toFixed(6),
                )
              : 0;
          totalPnl = Math.max(totalPnl, -100);
        }

        await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
          $inc: {
            totalSellAmount: tokenAmount,
            totalSellSolAmount: solAmount,
            ...(isFullSell && { realizedProfitSol: realizedProfit }),
          },
          $set: {
            currentAmount: remainingAmount,
            allocation: coin.allocation,
            lastPriceSol: currentPrice,
            averageSellPriceSol: newAverageSellPrice,
            nav: Math.max(0, newNav),
            totalPnl: totalPnl,
            unRealizedProfitSol: isFullSell ? 0 : undefined,
            status: isFullSell ? 'ALL_SELL' : 'HOLD',
            updatedAt: new Date(),
          },
        });

        // Portfolio value will be recalculated from database

        // Save trading result
        await this.tradingResultModel.create({
          fundId,
          symbol: coin.symbol,
          tokenAddress: coin.address,
          recommendation: 'SELL',
          analysis: coin.analysis,
          allocation: coin.allocation,
          txHash: 'virtual',
          tokenAmount,
          solAmount,
          priceSol: currentPrice,
          createdAt: new Date(),
        });
      }

      if (tradeExecuted) {
        results.push({
          symbol: coin.symbol,
          recommendation: coin.recommendation,
          tokenAmount,
          solAmount,
          price: currentPrice,
        });
      }
    }

    // Update unrealized profit for all portfolios (even when no trading occurs)
    const allPortfolios = await this.portfolioModel.find({
      fundId,
      status: 'HOLD',
      currentAmount: { $gt: 0.000001 },
    });

    for (const portfolio of allPortfolios) {
      if (portfolio.currentAmount <= 0) {
        console.warn(
          `Skipping portfolio ${portfolio.symbol} with negative/zero currentAmount: ${portfolio.currentAmount}`,
        );
        // Mark as ALL_SELL to prevent further processing
        await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
          $set: {
            currentAmount: 0,
            nav: 0,
            unRealizedProfitSol: 0,
            status: 'ALL_SELL',
            updatedAt: new Date(),
          },
        });
        continue;
      }

      // Get current price for this portfolio
      const coinPrice = await this.coinPriceModel.findOne({
        address: portfolio.tokenAddress,
      });

      if (coinPrice && coinPrice.priceSol > 0) {
        const currentPrice = coinPrice.priceSol;
        const unrealizedProfit = Number(
          (
            (currentPrice - portfolio.averageBuyPriceSol) *
            portfolio.currentAmount
          ).toFixed(6),
        );

        const currentNav = Number(
          (portfolio.currentAmount * currentPrice).toFixed(6),
        );
        const netInvestment = Number(
          (portfolio.totalBuySolAmount - portfolio.totalSellSolAmount).toFixed(
            6,
          ),
        );
        const totalPnl =
          netInvestment > 0
            ? Number(
                (((currentNav - netInvestment) / netInvestment) * 100).toFixed(
                  6,
                ),
              )
            : 0;

        const limitedTotalPnl = Math.max(totalPnl, -100);

        // Check if portfolio should be marked as ALL_SELL
        const isAllSold =
          portfolio.currentAmount <= 0.000001 || portfolio.allocation === 0;

        // Update portfolio with current unrealized profit
        await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
          $set: {
            lastPriceSol: currentPrice,
            unRealizedProfitSol: unrealizedProfit,
            nav: Math.max(0, currentNav),
            totalPnl: limitedTotalPnl,
            status: isAllSold ? 'ALL_SELL' : 'HOLD',
            updatedAt: new Date(),
          },
        });
      }
    }

    // Fix totalPnL for ALL_SELL portfolios that may have incorrect calculations
    const allSellPortfolios = await this.portfolioModel.find({
      fundId,
      status: 'ALL_SELL',
    });

    for (const portfolio of allSellPortfolios) {
      // For ALL_SELL portfolios, totalPnL should be based on total investment vs total return
      const totalInvestment = portfolio.totalBuySolAmount;
      const totalReturn = portfolio.totalSellSolAmount;
      const correctTotalPnl =
        totalInvestment > 0
          ? Number(
              (
                ((totalReturn - totalInvestment) / totalInvestment) *
                100
              ).toFixed(6),
            )
          : 0;

      // 🔥 FIX: Limit totalPnL to minimum -100%
      const limitedTotalPnl = Math.max(correctTotalPnl, -100);

      await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
        $set: {
          currentAmount: 0,
          nav: 0,
          unRealizedProfitSol: 0,
          totalPnl: limitedTotalPnl,
          updatedAt: new Date(),
        },
      });
    }

    // Recalculate total portfolio value and profits from all portfolios (including ALL_SELL)
    const allFundPortfolios = await this.portfolioModel.find({ fundId });

    let finalTotalPortfolioValue = 0;
    let totalUnrealizedProfit = 0;
    let totalRealizedProfitFromPortfolios = 0;

    for (const portfolio of allFundPortfolios) {
      finalTotalPortfolioValue += portfolio.nav || 0;
      totalUnrealizedProfit += portfolio.unRealizedProfitSol || 0;
      totalRealizedProfitFromPortfolios += portfolio.realizedProfitSol || 0;
    }

    // Calculate total NAV (SOL balance + all portfolio values)
    const totalNav = Number(
      (remainingSolBalance + finalTotalPortfolioValue).toFixed(6),
    );

    const totalPnl = Number(
      (
        ((totalNav - fundData.initialFundAmount) / fundData.initialFundAmount) *
        100
      ).toFixed(6),
    );

    // Add current totalPnl to history
    const currentTimestamp = new Date();
    const newPnlHistoryEntry = {
      value: totalPnl,
      timestamp: currentTimestamp,
    };

    // Update fund data with accurate calculations
    await this.fundDataModel.findByIdAndUpdate(fundId, {
      $inc: {
        solBalance: Number(totalSolChange.toFixed(6)),
      },
      $set: {
        realizedProfit: Number(totalRealizedProfitFromPortfolios.toFixed(6)),
        unRealizedProfit: Number(totalUnrealizedProfit.toFixed(6)),
        totalPnl: totalPnl,
        nav: totalNav,
        updatedAt: currentTimestamp,
      },
      $push: {
        totalPnLHistory: newPnlHistoryEntry,
      },
    });

    return results;
  }

  // 🔥 NEW: Utility method to fix corrupted portfolio data
  async fixCorruptedPortfolios(fundId?: string) {
    const query = fundId ? { fundId } : {};
    const corruptedPortfolios = await this.portfolioModel.find({
      ...query,
      $or: [
        { currentAmount: { $lt: 0 } }, // Negative current amount
        { nav: { $lt: 0 } }, // Negative NAV
        { totalPnl: { $lt: -100 } }, // totalPnL below -100%
      ],
    });

    const results = [];

    for (const portfolio of corruptedPortfolios) {
      const fixes = [];

      // Fix negative currentAmount
      if (portfolio.currentAmount < 0) {
        fixes.push(`currentAmount: ${portfolio.currentAmount} → 0`);
        portfolio.currentAmount = 0;
      }

      // Fix negative NAV
      if (portfolio.nav < 0) {
        fixes.push(`nav: ${portfolio.nav} → 0`);
        portfolio.nav = 0;
      }

      // Fix totalPnL below -100%
      if (portfolio.totalPnl < -100) {
        fixes.push(`totalPnl: ${portfolio.totalPnl}% → -100%`);
        portfolio.totalPnl = -100;
      }

      // If currentAmount is 0, mark as ALL_SELL
      if (portfolio.currentAmount === 0) {
        fixes.push(`status: ${portfolio.status} → ALL_SELL`);
        portfolio.status = 'ALL_SELL';
        portfolio.unRealizedProfitSol = 0;
      }

      // Update the portfolio
      await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
        $set: {
          currentAmount: portfolio.currentAmount,
          nav: portfolio.nav,
          totalPnl: portfolio.totalPnl,
          status: portfolio.status,
          unRealizedProfitSol:
            portfolio.currentAmount === 0 ? 0 : portfolio.unRealizedProfitSol,
          updatedAt: new Date(),
        },
      });

      results.push({
        symbol: portfolio.symbol,
        tokenAddress: portfolio.tokenAddress,
        fixes,
      });
    }

    return {
      success: true,
      message: `Fixed ${results.length} corrupted portfolios`,
      results,
    };
  }
}
