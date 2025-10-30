import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgentService } from 'src/agent/agent.service';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { TradingResult } from 'src/common/schemas/trading-result.schema';
import { SendaiService } from './service/sendai.service';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { Portfolio } from 'src/common/schemas/portfolio.schema';
import * as path from 'path';
import * as fs from 'fs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class RealTradingService {
  constructor(
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,

    @InjectModel('TradingResult')
    private tradingResultModel: Model<TradingResult>,

    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,

    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,

    private readonly agentService: AgentService,
    private readonly sendaiService: SendaiService,
  ) {}

  @Cron('0 * * * *')
  async handleRealTrading() {
    await this.fundRealTrading();
  }

  async fundRealTrading() {
    const fundDataList = await this.fundDataModel.find({
      isRealTrading: true,
      isSurvived: true,
    });

    for (const fundData of fundDataList) {
      const recommend = await this.agentService.getRecommendation(
        fundData._id.toString(),
      );

      // const recommend = this.getTestRecommendation();

      if (!recommend) {
        continue;
      }

      console.log(recommend);

      await this.processRealTrading(fundData, recommend);
    }
  }

  async processRealTrading(fundData: any, recommend: any) {
    const totalFund = fundData.nav;
    let totalSolChange = 0;

    for (const coin of recommend.coins) {
      try {
        if (coin.recommendation === 'buy') {
          const currentPosition = await this.portfolioModel.findOne({
            fundId: fundData._id,
            tokenAddress: coin.address,
          });

          // Calculate target allocation value in SOL
          const targetAllocationValue = (coin.allocation / 100) * totalFund;

          // Calculate current position value in SOL
          const currentPositionValue = currentPosition
            ? currentPosition.nav || 0
            : 0;

          const buyAmount = Math.max(
            0,
            targetAllocationValue - currentPositionValue,
          );

          // Execute trade only when buyAmount is greater than threshold
          if (buyAmount <= 0.01) {
            console.log(
              `Buy amount too small for ${coin.symbol}: ${buyAmount} SOL (minimum: 0.01 SOL)`,
            );
            continue;
          }

          console.log(
            `Buying ${coin.symbol}: Target=${targetAllocationValue} SOL, Current=${currentPositionValue} SOL, BuyAmount=${buyAmount} SOL`,
          );

          const swap = await this.sendaiService.executeSwap({
            amount: buyAmount.toFixed(6),
            fromTokenAddress: '11111111111111111111111111111111',
            toTokenAddress: coin.address,
            slippage: '1',
          });

          // Retry up to 10 times with 5 second intervals
          let txResult;
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

            console.log(
              `Attempt ${i + 1}/10: Parsing transaction ${swap.transactionId}`,
            );

            txResult = await this.sendaiService.parseSwapTransaction(
              swap.transactionId,
            );

            if (txResult.status === 'success') {
              console.log(`Transaction parsing successful on attempt ${i + 1}`);
              break;
            }

            console.log(`Attempt ${i + 1} failed: ${txResult.message}`);

            if (i === 9) {
              throw new Error(
                `Transaction parsing failed after 10 attempts: ${swap.transactionId} - Last error: ${txResult.message}`,
              );
            }
          }

          console.log(txResult);

          // 🔥 VALIDATION: Check if actual trade amount is significantly different from target
          const actualSolAmount = txResult.data.fromToken.amount;
          const percentageDifference =
            Math.abs((actualSolAmount - buyAmount) / buyAmount) * 100;

          if (percentageDifference > 50) {
            console.warn(
              `Warning: Significant difference between target and actual trade amount for ${coin.symbol}:`,
            );
            console.warn(`  - Target: ${buyAmount} SOL`);
            console.warn(`  - Actual: ${actualSolAmount} SOL`);
            console.warn(`  - Difference: ${percentageDifference.toFixed(1)}%`);
          }

          if (actualSolAmount < 0.01) {
            console.warn(
              `Warning: Very small trade amount for ${coin.symbol}: ${actualSolAmount} SOL`,
            );
            console.warn(
              `This may result in extreme totalPnL calculations. Consider increasing minimum trade amount.`,
            );
          }

          // Update portfolio with actual trading results
          await this.updatePortfolioFromTxResult(
            fundData._id.toString(),
            coin,
            txResult,
            'buy',
          );

          // 🔥 FIX: Use SOL amount (fromToken.amount) for BUY transactions
          totalSolChange -= txResult.data.fromToken.amount;
        } else if (coin.recommendation === 'sell') {
          const currentPosition = await this.portfolioModel.findOne({
            fundId: fundData._id,
            tokenAddress: coin.address,
          });

          if (!currentPosition || currentPosition.currentAmount <= 0) {
            console.log(`No position to sell for ${coin.symbol}`);
            continue;
          }

          const targetAllocation = coin.allocation;

          // Calculate target and current values in SOL
          const targetValue = (targetAllocation / 100) * totalFund;
          const currentValue = currentPosition.nav || 0;

          // Calculate token amount to sell
          let sellTokenAmount;
          let sellValue;

          if (targetAllocation === 0) {
            // Full sell - sell all tokens
            sellTokenAmount = currentPosition.currentAmount;
            sellValue = currentValue; // All current value
          } else {
            // Partial sell - only if current value > target value
            if (currentValue <= targetValue) {
              console.log(
                `No need to sell ${coin.symbol}. Current: ${currentValue} SOL, Target: ${targetValue} SOL`,
              );
              continue;
            }

            sellValue = currentValue - targetValue;

            // Calculate tokens to sell based on current price
            const coinPriceInfo = await this.coinPriceModel.findOne({
              address: coin.address,
            });

            if (!coinPriceInfo || !coinPriceInfo.priceSol) {
              console.log(`No price info for ${coin.symbol}`);
              continue;
            }

            sellTokenAmount = sellValue / coinPriceInfo.priceSol;
          }

          // CRITICAL: Prevent selling more than current holdings
          if (sellTokenAmount > currentPosition.currentAmount) {
            console.log(
              `Cannot sell ${sellTokenAmount} tokens of ${coin.symbol}. Only ${currentPosition.currentAmount} available. Selling all available.`,
            );
            sellTokenAmount = currentPosition.currentAmount;
            sellValue = currentValue; // Adjust sellValue accordingly
          }

          if (sellTokenAmount <= 0.000001) {
            console.log(
              `Sell amount too small for ${coin.symbol}: ${sellTokenAmount} tokens`,
            );
            continue;
          }

          console.log(
            `Selling ${coin.symbol}: ${sellTokenAmount} tokens (${sellValue.toFixed(6)} SOL value). Available: ${currentPosition.currentAmount} tokens`,
          );

          const swap = await this.sendaiService.executeSwap({
            amount: sellTokenAmount.toFixed(6),
            fromTokenAddress: coin.address,
            toTokenAddress: '11111111111111111111111111111111',
            slippage: '1',
          });

          // Retry up to 10 times with 5 second intervals
          let txResult;
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 5000));

            console.log(
              `Attempt ${i + 1}/10: Parsing transaction ${swap.transactionId}`,
            );

            txResult = await this.sendaiService.parseSwapTransaction(
              swap.transactionId,
            );

            if (txResult.status === 'success') {
              console.log(`Transaction parsing successful on attempt ${i + 1}`);
              break;
            }

            console.log(`Attempt ${i + 1} failed: ${txResult.message}`);

            if (i === 9) {
              throw new Error(
                `Transaction parsing failed after 10 attempts: ${swap.transactionId} - Last error: ${txResult.message}`,
              );
            }
          }

          console.log(txResult);

          // Update portfolio with actual trading results
          await this.updatePortfolioFromTxResult(
            fundData._id.toString(),
            coin,
            txResult,
            'sell',
          );

          totalSolChange += txResult.data.toToken.amount;
        }
      } catch (error) {
        console.error(`Error processing ${coin.symbol}:`, error);
      }
    }

    // Update unrealized profit for all portfolios based on current market prices
    await this.updateUnrealizedProfits(fundData._id.toString());

    // Update fund data (always update to reflect portfolio changes)
    await this.updateFundData(fundData._id.toString(), totalSolChange);
  }

  async updatePortfolioFromTxResult(
    fundId: string,
    coin: any,
    txResult: any,
    tradeType: 'buy' | 'sell',
  ) {
    if (txResult.status !== 'success' || !txResult.data) {
      console.error('Invalid txResult for portfolio update');
      return;
    }

    const { fromToken, toToken, signature } = txResult.data;

    // Price calculation: Token price based on SOL
    let priceSol: number;
    let tokenAmount: number;
    let solAmount: number;

    if (tradeType === 'buy') {
      // SOL -> Token swap
      // 🔥 FIX: Correct assignment based on parseSwapTransaction structure
      // fromToken = SOL (what user pays), toToken = TOKEN (what user receives)
      priceSol = fromToken.amount / toToken.amount; // SOL amount / token amount = price per token
      tokenAmount = toToken.amount; // toToken contains token amount (what user receives)
      solAmount = fromToken.amount; // fromToken contains SOL amount (what user pays)
    } else {
      // Token -> SOL swap
      priceSol = toToken.amount / fromToken.amount;
      tokenAmount = fromToken.amount;
      solAmount = toToken.amount;
    }

    // Find or create portfolio
    const portfolio = await this.portfolioModel.findOne({
      fundId,
      tokenAddress: coin.address,
    });

    if (tradeType === 'buy') {
      if (!portfolio) {
        // Create new portfolio
        // Calculate initial nav and totalPnl for new portfolio
        const initialNav = tokenAmount * priceSol; // Current value of tokens
        const initialTotalPnl = 0; // No profit/loss at the start

        await this.portfolioModel.create({
          fundId,
          symbol: coin.symbol,
          tokenAddress: coin.address,
          currentAmount: tokenAmount,
          allocation: coin.allocation,
          lastPriceSol: priceSol,
          totalBuyAmount: tokenAmount,
          totalSellAmount: 0,
          totalBuySolAmount: solAmount,
          totalSellSolAmount: 0,
          averageBuyPriceSol: priceSol,
          averageSellPriceSol: 0,
          realizedProfitSol: 0,
          unRealizedProfitSol: 0,
          totalPnl: initialTotalPnl,
          nav: initialNav,
          status: 'HOLD',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Update existing portfolio
        const newAverageBuyPrice =
          (portfolio.totalBuySolAmount + solAmount) /
          (portfolio.totalBuyAmount + tokenAmount);

        const newNav = (portfolio.currentAmount + tokenAmount) * priceSol;
        const netInvestment =
          portfolio.totalBuySolAmount +
          solAmount -
          portfolio.totalSellSolAmount;
        const totalPnl = ((newNav - netInvestment) / netInvestment) * 100;

        // 🔥 ENHANCEMENT: Add upper limit to prevent extreme totalPnL when netInvestment is very small
        const originalInvestment = portfolio.totalBuySolAmount + solAmount;
        const netInvestmentRatio = netInvestment / originalInvestment;

        let finalTotalPnl = totalPnl;
        if (netInvestmentRatio < 0.01) {
          // Less than 1% of original investment remains
          const totalReturn = portfolio.totalSellSolAmount + newNav;
          const alternativeTotalPnl =
            ((totalReturn - originalInvestment) / originalInvestment) * 100;
          finalTotalPnl = Math.max(alternativeTotalPnl, -100);

          console.log(
            `Portfolio ${portfolio.symbol}: Using alternative totalPnl calculation due to small netInvestment (${netInvestmentRatio * 100}%)`,
          );
          console.log(
            `Original totalPnl: ${totalPnl}%, Alternative totalPnl: ${finalTotalPnl}%`,
          );
        }

        // 🔥 ENHANCEMENT: Limit totalPnl to minimum -100% (can't lose more than invested)
        finalTotalPnl = Math.max(finalTotalPnl, -100);

        await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
          $inc: {
            currentAmount: tokenAmount,
            totalBuyAmount: tokenAmount,
            totalBuySolAmount: solAmount,
          },
          $set: {
            allocation: coin.allocation,
            lastPriceSol: priceSol,
            averageBuyPriceSol: newAverageBuyPrice,
            nav: newNav,
            totalPnl: finalTotalPnl,
            status: 'HOLD',
            updatedAt: new Date(),
          },
        });
      }
    } else if (tradeType === 'sell' && portfolio) {
      // Process sell order
      const realizedProfit =
        (priceSol - portfolio.averageBuyPriceSol) * tokenAmount;
      const remainingAmount = Math.max(
        0,
        portfolio.currentAmount - tokenAmount,
      );

      const newAverageSellPrice =
        (portfolio.totalSellSolAmount + solAmount) /
        (portfolio.totalSellAmount + tokenAmount);

      let newNav, totalPnl;
      const isAllSold = remainingAmount <= 0.000001 || coin.allocation === 0;

      if (isAllSold) {
        // Full sell
        newNav = 0;
        const totalInvestment = portfolio.totalBuySolAmount;
        const totalReturn = portfolio.totalSellSolAmount + solAmount;
        totalPnl = ((totalReturn - totalInvestment) / totalInvestment) * 100;
        totalPnl = Math.max(totalPnl, -100);
      } else {
        // Partial sell
        newNav = remainingAmount * priceSol;
        const netInvestment =
          portfolio.totalBuySolAmount -
          (portfolio.totalSellSolAmount + solAmount);
        totalPnl =
          netInvestment > 0
            ? ((newNav - netInvestment) / netInvestment) * 100
            : 0;
        totalPnl = Math.max(totalPnl, -100);

        // 🔥 ENHANCEMENT: Add upper limit to prevent extreme totalPnL when netInvestment is very small
        const originalInvestment = portfolio.totalBuySolAmount;
        const netInvestmentRatio = netInvestment / originalInvestment;

        if (netInvestmentRatio < 0.01) {
          // Less than 1% of original investment remains
          const totalReturn = portfolio.totalSellSolAmount + solAmount + newNav;
          const alternativeTotalPnl =
            ((totalReturn - originalInvestment) / originalInvestment) * 100;
          totalPnl = Math.max(alternativeTotalPnl, -100);

          console.log(
            `Portfolio ${portfolio.symbol}: Using alternative totalPnl calculation due to small netInvestment (${netInvestmentRatio * 100}%)`,
          );
          console.log(
            `Original totalPnl: ${totalPnl}%, Alternative totalPnl: ${totalPnl}%`,
          );
        }

        // 🔥 ENHANCEMENT: Limit totalPnl to minimum -100% (can't lose more than invested)
        totalPnl = Math.max(totalPnl, -100);
      }

      await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
        $inc: {
          totalSellAmount: tokenAmount,
          totalSellSolAmount: solAmount,
          realizedProfitSol: realizedProfit,
        },
        $set: {
          currentAmount: remainingAmount,
          allocation: coin.allocation,
          lastPriceSol: priceSol,
          averageSellPriceSol: newAverageSellPrice,
          nav: Math.max(0, newNav),
          totalPnl: totalPnl,
          unRealizedProfitSol: isAllSold ? 0 : undefined,
          status: isAllSold ? 'ALL_SELL' : 'HOLD',
          updatedAt: new Date(),
        },
      });
    }

    // Save trading result
    await this.tradingResultModel.create({
      fundId,
      symbol: coin.symbol,
      tokenAddress: coin.address,
      recommendation: tradeType.toUpperCase(),
      analysis: coin.analysis,
      allocation: coin.allocation,
      txHash: signature,
      tokenAmount,
      solAmount,
      priceSol: priceSol,
      createdAt: new Date(),
    });
  }

  async updateUnrealizedProfits(fundId: string) {
    // Update unrealized profit for all portfolios based on current market prices
    const allPortfolios = await this.portfolioModel.find({
      fundId,
      status: 'HOLD',
      currentAmount: { $gt: 0.000001 },
    });

    for (const portfolio of allPortfolios) {
      // Skip portfolios with negative currentAmount (data corruption)
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
        const unrealizedProfit =
          (currentPrice - portfolio.averageBuyPriceSol) *
          portfolio.currentAmount;

        const currentNav = portfolio.currentAmount * currentPrice;
        const netInvestment =
          portfolio.totalBuySolAmount - portfolio.totalSellSolAmount;
        const totalPnl =
          netInvestment > 0
            ? ((currentNav - netInvestment) / netInvestment) * 100
            : 0;

        // Limit totalPnL to minimum -100%
        const limitedTotalPnl = Math.max(totalPnl, -100);

        // 🔥 ENHANCEMENT: Add upper limit to prevent extreme totalPnL when netInvestment is very small
        const originalInvestment = portfolio.totalBuySolAmount;
        const netInvestmentRatio = netInvestment / originalInvestment;

        let finalTotalPnl = limitedTotalPnl;
        if (netInvestmentRatio < 0.01) {
          // Less than 1% of original investment remains
          const totalReturn = portfolio.totalSellSolAmount + currentNav;
          const alternativeTotalPnl =
            ((totalReturn - originalInvestment) / originalInvestment) * 100;
          finalTotalPnl = Math.max(alternativeTotalPnl, -100);

          console.log(
            `Portfolio ${portfolio.symbol}: Using alternative totalPnl calculation due to small netInvestment (${netInvestmentRatio * 100}%)`,
          );
          console.log(
            `Original totalPnl: ${limitedTotalPnl}%, Alternative totalPnl: ${finalTotalPnl}%`,
          );
        }

        // 🔥 ENHANCEMENT: Monitor for unusually small original investments
        if (originalInvestment < 0.01) {
          console.info(
            `Portfolio ${portfolio.symbol}: Small original investment (${originalInvestment} SOL) results in high totalPnL (${finalTotalPnl}%)`,
          );
          console.info(
            `Current NAV: ${currentNav} SOL, Net Investment: ${netInvestment} SOL`,
          );
        }

        // 🔥 ENHANCEMENT: Limit totalPnl to minimum -100% (can't lose more than invested)
        finalTotalPnl = Math.max(finalTotalPnl, -100);

        // Check if portfolio should be marked as ALL_SELL (very small remaining amount)
        const isAllSold =
          portfolio.currentAmount <= 0.000001 || portfolio.allocation === 0;

        // Update portfolio with current unrealized profit
        await this.portfolioModel.findByIdAndUpdate(portfolio._id, {
          $set: {
            lastPriceSol: currentPrice,
            unRealizedProfitSol: unrealizedProfit,
            nav: Math.max(0, currentNav),
            totalPnl: finalTotalPnl,
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
          ? ((totalReturn - totalInvestment) / totalInvestment) * 100
          : 0;

      // Limit totalPnL to minimum -100%
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
  }

  async updateFundData(fundId: string, totalSolChange: number) {
    // Recalculate all portfolio values
    const allPortfolios = await this.portfolioModel.find({ fundId });

    let totalPortfolioValue = 0;
    let totalUnrealizedProfit = 0;
    let totalRealizedProfit = 0;

    for (const portfolio of allPortfolios) {
      totalPortfolioValue += portfolio.nav || 0;
      totalUnrealizedProfit += portfolio.unRealizedProfitSol || 0;
      totalRealizedProfit += portfolio.realizedProfitSol || 0;
    }

    const fundData = await this.fundDataModel.findById(fundId);
    if (!fundData) return;

    const newSolBalance = fundData.solBalance + totalSolChange;
    const totalNav = newSolBalance + totalPortfolioValue;
    const totalPnl =
      ((totalNav - fundData.initialFundAmount) / fundData.initialFundAmount) *
      100;

    // Add current totalPnl to history
    const currentTimestamp = new Date();
    const newPnlHistoryEntry = {
      value: totalPnl,
      timestamp: currentTimestamp,
    };

    await this.fundDataModel.findByIdAndUpdate(fundId, {
      $set: {
        solBalance: newSolBalance,
        realizedProfit: totalRealizedProfit,
        unRealizedProfit: totalUnrealizedProfit,
        totalPnl: totalPnl,
        nav: totalNav,
        updatedAt: currentTimestamp,
      },
      $push: {
        totalPnLHistory: newPnlHistoryEntry,
      },
    });
  }

  private getTestRecommendation() {
    const testJsonPath = path.join(process.cwd(), 'test.json');
    const testData = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));
    return testData;
  }
}
