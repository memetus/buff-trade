import { Controller, Get, Query } from '@nestjs/common';
import { TokenPoolService } from './token-pool.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Token Pool')
@Controller('token-pool')
export class TokenPoolController {
  constructor(private readonly tokenPoolService: TokenPoolService) {}

  @Get('trend-tokens')
  async getTrendTokens() {
    return this.tokenPoolService.getTrendTokens();
  }

  @Get('token-info')
  async getTokenInfo(@Query('address') address: string) {
    return this.tokenPoolService.getTokenInfo(address);
  }
}
