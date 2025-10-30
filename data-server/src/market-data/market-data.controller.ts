import { Controller, Get } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Market Data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('market-data')
  async getMarketDataFromCodex() {
    return this.marketDataService.getMarketDataFromCodex();
  }
}
