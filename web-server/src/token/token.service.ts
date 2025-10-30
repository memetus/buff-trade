import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateAgentDto,
  CreateTokenDto,
  TokenTransactionDto,
} from './dto/req.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token } from 'src/common/schemas/token.schema';
import { deleteFileFromS3 } from 'src/common/middleware/multer-options.factory';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Users } from 'src/common/schemas/users.schema';
import { TokenTransaction } from 'src/common/schemas/token-transaction.schema';
import { TradingResult } from 'src/common/schemas/trading-result.schema';
import { Strategy } from 'src/common/schemas/strategy.schema';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel('Token')
    private tokenModel: Model<Token>,
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,
    @InjectModel('Users')
    private usersModel: Model<Users>,
    @InjectModel('TokenTransaction')
    private tokenTransactionModel: Model<TokenTransaction>,
    @InjectModel('TradingResult')
    private tradingResultModel: Model<TradingResult>,
    @InjectModel('Strategy')
    private strategyModel: Model<Strategy>,
  ) {}
  async createAgent(data: CreateAgentDto, file: any) {
    const tokenData = {
      creator: data.creator,
      tokenAddress: '',
      bondingCurvePool: '',
      fundId: '',
      name: data.name,
      ticker: data.ticker,
      imageUrl: file.location,
      strategyPrompt: data.strategyPrompt,
      isMigration: false,
      website: data.website || '',
      twitter: data.twitter || '',
      telegram: data.telegram || '',
    };

    const token = new this.tokenModel(tokenData);

    await token.save();

    return {
      tokenId: token._id.toString(),
      imageUrl: token.imageUrl,
    };
  }

  async createToken(data: CreateTokenDto) {
    const tokenInfo = await this.tokenModel.findById(data.tokenId);

    const fundInfo = await this.fundDataModel.create({
      name: tokenInfo.name,
      ticker: tokenInfo.ticker,
      imageUrl: tokenInfo.imageUrl,
      creator: tokenInfo.creator,
      tokenAddress: data.tokenAddress,
      bondingCurvePool: data.bondingCurvePool,
      dammV2Pool: '',
      tokenId: tokenInfo._id.toString(),
      strategyPrompt: tokenInfo.strategyPrompt,
      initialFundAmount: 1000,
      solBalance: 1000,
      isRealTrading: false,
      isRunning: true,
      isMigrated: false,
      generation: 1,
      totalPnl: 0,
      nav: 1000,
      realizedProfit: 0,
      unRealizedProfit: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      website: tokenInfo.website,
      twitter: tokenInfo.twitter,
      telegram: tokenInfo.telegram,
    });

    await tokenInfo.save();

    const tokenUpdatedInfo = await this.tokenModel.findByIdAndUpdate(
      data.tokenId,
      {
        fundId: fundInfo._id.toString(),
        tokenAddress: data.tokenAddress,
        bondingCurvePool: data.bondingCurvePool,
      },
      { new: true },
    );

    return {
      tokenId: tokenUpdatedInfo._id.toString(),
      fundId: fundInfo._id.toString(),
      imageUrl: tokenUpdatedInfo.imageUrl,
    };
  }

  async removeAgent(tokenId: string) {
    const tokenInfo = await this.tokenModel.findById(tokenId);

    if (!tokenInfo) {
      throw new BadRequestException('Token not found');
    }

    try {
      await deleteFileFromS3(tokenInfo.imageUrl);

      await this.tokenModel.deleteOne({ _id: tokenId });
      await this.fundDataModel.deleteOne({ tokenId });

      return { success: true, message: 'Agent removed successfully' };
    } catch (error) {
      throw new Error(`Failed to remove agent: ${error.message}`);
    }
  }

  async saveTokenTransaction(data: TokenTransactionDto, userId: string) {
    const userInfo = await this.usersModel.findById(userId);

    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    const tokenTransaction = await this.tokenTransactionModel.create({
      ...data,
      walletAddress: userInfo.wallet,
    });

    return {
      success: true,
      message: 'Token transaction saved successfully',
      tokenTransactionId: tokenTransaction._id.toString(),
    };
  }

  async getTransactionTicker() {
    const agnetTradingInfo = await this.tradingResultModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const fundIds = agnetTradingInfo.map((item) => item.fundId);

    const fundDataList = await this.fundDataModel
      .find({ _id: { $in: fundIds } })
      .select('_id ticker')
      .lean();

    const fundDataMap = new Map(
      fundDataList.map((fund) => [fund._id.toString(), fund.ticker]),
    );

    const agentTradingResult = agnetTradingInfo.map((item) => ({
      agentTicker: fundDataMap.get(item.fundId),
      type: item.recommendation,
      solAmount: item.solAmount,
      tokenTicker: item.symbol,
    }));

    const tokenTransactionInfo = await this.tokenTransactionModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const tokenTransactionResult = tokenTransactionInfo.map((item) => ({
      walletAddress: item.walletAddress,
      tokenTicker: item.tokenTicker,
      type: item.type,
      tokenAmount: item.tokenAmount,
    }));

    return {
      agentTradingResult: agentTradingResult,
      tokenTransaction: tokenTransactionResult,
    };
  }
  async getRandomStrategyPrompt() {
    const strategyPrompt = await this.strategyModel.aggregate([
      { $sample: { size: 1 } },
    ]);

    const result = strategyPrompt[0];

    if (result && result.strategy && typeof result.strategy === 'string') {
      result.strategy = result.strategy.replace(/^"(.*)"$/, '$1');
    }

    return result;
  }
}
