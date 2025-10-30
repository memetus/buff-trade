import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { Model } from 'mongoose';
import { CONSTANTS } from 'src/common/config/constants';
import { Portfolio } from 'src/common/schemas/portfolio.schema';
import { TrendToken } from 'src/common/schemas/trend-token.schema';

@Injectable()
export class TokenPoolService {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,

    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,

    private configService: ConfigService,
  ) {}

  @Cron('40 * * * *')
  async handleCronTrendToken() {
    console.log('TrendToken is starting...');
    await this.getTrendTokens();
    console.log('TrendToken is completed...');
  }

  async getTrendTokens() {
    const fundPortfolioTokens = await this.portfolioModel.find();

    const portfolioAddresses = fundPortfolioTokens
      .map((token) => token.tokenAddress)
      .filter(Boolean);

    const uniquePortfolioAddresses = [...new Set(portfolioAddresses)];

    const totalTokens = await this.trendTokenModel.countDocuments({
      address: { $nin: uniquePortfolioAddresses },
    });

    if (totalTokens > CONSTANTS.totalTrendingTokens) {
      // txnCount24 기준으로 정렬하여 하위 토큰들 삭제
      const tokensToRemove = await this.trendTokenModel
        .find({ address: { $nin: uniquePortfolioAddresses } })
        .sort({ txnCount24: 1 })
        .limit(totalTokens - CONSTANTS.totalTrendingTokens);

      console.log('tokensToRemove:', tokensToRemove);

      const addressesToRemove = tokensToRemove.map((token) => token.address);

      // 삭제 전 토큰 수
      const beforeCount = await this.trendTokenModel.countDocuments();

      // 삭제 실행
      await this.trendTokenModel.deleteMany({
        address: { $in: addressesToRemove },
      });

      // 삭제 후 토큰 수
      const afterCount = await this.trendTokenModel.countDocuments();

      console.log(
        `Token count - Before: ${beforeCount}, After: ${afterCount}, Removed: ${beforeCount - afterCount}`,
      );
    }

    const url = CONSTANTS.codexUrl;
    const limit = CONSTANTS.getTrendingTokensLimit;
    const authToken = this.configService.get<string>(
      'thirdParty.dataServiceKey',
    );

    if (!authToken) {
      console.error('Codex API token is not configured');
      return [];
    }

    const query = {
      query: `
        {
          filterTokens(
            filters: {
                network: [1399811149],
                potentialScam: false,
                marketCap: {
                  gte: 300000   
                },
                liquidity: {
                  gte: 50000    
                },
                txnCount24: {
                  gte: 10        
                }
            },
            rankings: [
              {attribute: trendingScore1, direction: DESC},
            ],
            limit: ${limit}
          ) {
            count
            page
            results {
              isScam
              marketCap
              txnCount24
              createdAt
              token {
                address
                name
                symbol
                creatorAddress 
                createdAt
                info {
                  description
                }
                exchanges {
                  name
                  id
                }
                socialLinks {
                  discord 
                  github 
                  instagram 
                  linkedin 
                  reddit 
                  telegram 
                  twitter 
                  website   
                  whitepaper 
                  youtube 
                }
              }
            }
          }
        }
      `,
    };

    const response = await axios
      .post(url, query, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
      })
      .catch((error) => {
        console.error('Codex API request failed:', error.message);
        return { data: null };
      });

    if (!response.data?.data?.filterTokens?.results) {
      console.error('Invalid response format:', response.data);
      return [];
    }

    const { results } = response.data.data.filterTokens;

    const transformedResults = results
      .filter((result) => result.token.socialLinks?.twitter)
      .map((result) => ({
        address: result.token.address,
        name: result.token.name,
        symbol: result.token.symbol,
        creatorAddress: result.token.creatorAddress,
        description: result.token.info.description,
        exchanges: result.token.exchanges || [],
        socialLinks: result.token.socialLinks,
        createdAt: new Date(result.token.createdAt * 1000),
        marketCap: result.marketCap,
        txnCount24: result.txnCount24,
      }));

    if (transformedResults.length > 0) {
      const bulkOps = transformedResults.map((item) => ({
        updateOne: {
          filter: { address: item.address },
          update: { $set: item },
          upsert: true,
        },
      }));

      await this.trendTokenModel.bulkWrite(bulkOps);
      console.log(
        `Updated ${transformedResults.length} tokens with Twitter links`,
      );
    }

    // await this.embeddingService.createEmbeddingsTrendToken();
    return `Updated ${transformedResults.length} tokens with Twitter links`;
  }

  async getTokenInfo(address: string) {
    const url = CONSTANTS.codexUrl;
    const authToken = this.configService.get<string>(
      'thirdParty.dataServiceKey',
    );

    if (!authToken) {
      console.error('Codex API token is not configured');
      return null;
    }

    const query = {
      query: `
        {
          filterTokens(
            tokens: ["${address}"]
          ) {
            results {
              isScam
              marketCap
              txnCount24
              createdAt
              token {
                address
                name
                symbol
                creatorAddress 
                createdAt
                info {
                  description
                }
                exchanges {
                  name
                  id
                }
                socialLinks {
                  discord 
                  github 
                  instagram 
                  linkedin 
                  reddit 
                  telegram 
                  twitter 
                  website   
                  whitepaper 
                  youtube 
                }
              }
            }
          }
        }
      `,
    };

    const response = await axios
      .post(url, query, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
      })
      .catch((error) => {
        console.error('Codex API request failed:', error.message);
        if (error.response?.data) {
          console.error('API response data:', error.response.data);
        }
        return { data: null };
      });

    if (!response.data?.data?.filterTokens?.results) {
      console.error('Invalid response format:', response.data);
      return null;
    }

    const { results } = response.data.data.filterTokens;

    if (results.length === 0) {
      console.log(`No token found for address: ${address}`);
      return null;
    }

    const result = results[0];
    const transformedResult = {
      address: result.token.address,
      name: result.token.name,
      symbol: result.token.symbol,
      creatorAddress: result.token.creatorAddress,
      description: result.token.info.description,
      exchanges: result.token.exchanges || [],
      socialLinks: result.token.socialLinks,
      createdAt: new Date(result.token.createdAt * 1000),
      marketCap: result.marketCap,
      txnCount24: result.txnCount24,
      isScam: result.isScam,
    };

    // 데이터베이스에 저장 (upsert)
    try {
      await this.trendTokenModel.updateOne(
        { address: transformedResult.address },
        { $set: transformedResult },
        { upsert: true },
      );
      console.log(`Token info saved to database: ${transformedResult.address}`);
    } catch (error) {
      console.error('Failed to save token info to database:', error);
    }

    return transformedResult;
  }
}
