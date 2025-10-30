import { CONSTANTS } from './../common/config/constants';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';
import { Cron } from '@nestjs/schedule';
import { TrendToken } from 'src/common/schemas/trend-token.schema';
import { EmbeddingService } from 'src/embedding/embedding.service';

@Injectable()
export class MarketDataService {
  constructor(
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,

    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,

    private embeddingService: EmbeddingService,
    private configService: ConfigService,
  ) {}

  @Cron('50 * * * *')
  async handleCronMarketData() {
    console.log('MarketData is starting...');
    await this.getMarketDataFromCodex();
    console.log('MarketData is completed...');
  }

  async getMarketDataFromCodex(): Promise<string> {
    const trendTokenInfo = await this.trendTokenModel.find().lean();

    const batchSize = 200;
    // SOL 토큰 주소를 항상 포함
    const allTokensList = [
      '"So11111111111111111111111111111111111111112:1399811149"',
      ...trendTokenInfo.map(({ address }) => `"${address}:1399811149"`),
    ];
    const totalBatches = Math.ceil(allTokensList.length / batchSize);

    let allResults = [];
    const totalData = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, allTokensList.length);
      const batchTokensList = allTokensList.slice(startIndex, endIndex);

      const url = CONSTANTS.codexUrl;
      const query = {
        query: `
            {
              filterTokens(
                tokens: [${batchTokensList.join(',')}],
                limit: ${batchSize},
                offset: 0
              ) {
                count
                page
                results {
                  buyCount1
                  buyCount4
                  buyCount5m
                  buyCount12
                  buyCount24
                  change1
                  change4
                  change5m
                  change12
                  change24
                  createdAt
                  high1
                  high4
                  high5m
                  high12
                  high24
                  holders
                  lastTransaction
                  liquidity
                  low1
                  low4
                  low5m
                  low12
                  low24
                  marketCap
                  priceUSD
                  sellCount1
                  sellCount4
                  sellCount5m
                  sellCount12
                  sellCount24
                  token {
                    address
                    name
                    symbol
                    imageThumbUrl
                  }
                  txnCount1
                  txnCount4
                  txnCount5m
                  txnCount12
                  txnCount24
                  uniqueBuys1
                  uniqueBuys4
                  uniqueBuys5m
                  uniqueBuys12
                  uniqueBuys24
                  uniqueSells1
                  uniqueSells4
                  uniqueSells5m
                  uniqueSells12
                  uniqueSells24
                  uniqueTransactions1
                  uniqueTransactions4
                  uniqueTransactions5m
                  uniqueTransactions12
                  uniqueTransactions24
                  volume1
                  volume4
                  volume5m
                  volume12
                  volume24
                  volumeChange1
                  volumeChange4
                  volumeChange5m
                  volumeChange12
                  volumeChange24               
                  walletAgeAvg
                  walletAgeStd
                  swapPct1dOldWallet
                  swapPct7dOldWallet
                }
              }
            }
          `,
      };

      try {
        const response = await axios.post(url, query, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.configService.get<string>(
              'thirdParty.dataServiceKey',
            ),
          },
        });

        if (response.data.data?.filterTokens?.results) {
          allResults = [
            ...allResults,
            ...response.data.data.filterTokens.results,
          ];
        }
      } catch (error) {
        // Error handling
      }
    }

    const transformedResults = allResults.map((result) => {
      const matchingToken = trendTokenInfo.find(
        (token) =>
          token.address.toLowerCase() === result.token.address.toLowerCase(),
      );

      return {
        ...result,
        address: result.token.address,
        name: result.token.name,
        symbol: result.token.symbol,
        category: matchingToken?.categories || [],
        createdAt: result.createdAt
          ? new Date(result.createdAt * 1000)
          : result.createdAt,
        // 퍼센트 값 변환 (소수 -> 백분율)
        imageThumbUrl: result.token.imageThumbUrl,
        swapPct1dOldWallet: result.swapPct1dOldWallet
          ? `${(parseFloat(result.swapPct1dOldWallet) * 100).toFixed(2)}%`
          : result.swapPct1dOldWallet,
        swapPct7dOldWallet: result.swapPct7dOldWallet
          ? `${(parseFloat(result.swapPct7dOldWallet) * 100).toFixed(2)}%`
          : result.swapPct7dOldWallet,
        // 나이 값 변환 (초 -> 일)
        walletAgeAvg: result.walletAgeAvg
          ? `${(parseFloat(result.walletAgeAvg) / 86400).toFixed(1)} days`
          : result.walletAgeAvg,
        walletAgeStd: result.walletAgeStd
          ? `${(parseFloat(result.walletAgeStd) / 86400).toFixed(1)} days`
          : result.walletAgeStd,
      };
    });

    // WSOL 가격 찾기
    const wsolPrice = transformedResults.find(
      (result) =>
        result.address === 'So11111111111111111111111111111111111111112',
    )?.priceUSD;

    if (wsolPrice) {
      // WSOL 가격을 기준으로 모든 코인의 SOL 가격 계산
      transformedResults.forEach((result) => {
        if (result.priceUSD) {
          result.priceSol = Number(result.priceUSD) / Number(wsolPrice);
        }
      });
    }

    totalData.push(...transformedResults);

    // Update coin price database
    const updatePromises = totalData.map((item) =>
      this.coinPriceModel.updateOne(
        { address: item.address },
        { $set: item },
        { upsert: true },
      ),
    );

    await Promise.all(updatePromises);

    await this.embeddingService.createEmbeddingsCoinPrice();

    return 'success market data';
  }
}
