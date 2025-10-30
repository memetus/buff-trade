import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RealTradingService } from './real-trading.service';
import { ApiTags } from '@nestjs/swagger';
import { SendaiService } from './service/sendai.service';
import { CreateSwapDto } from './dto/req.dto';

@ApiTags('Real Trading')
@Controller('real-trading')
export class RealTradingController {
  constructor(
    private readonly realTradingService: RealTradingService,
    private readonly sendaiService: SendaiService,
  ) {}

  @Get('fund-real-trading')
  async fundRealTrading() {
    return this.realTradingService.fundRealTrading();
  }

  @Post('quote')
  async getQuote(@Body() createSwapDto: CreateSwapDto) {
    return this.sendaiService.getQuote(createSwapDto);
  }

  @Post('swap')
  async swap(@Body() createSwapDto: CreateSwapDto) {
    return this.sendaiService.executeSwap(createSwapDto);
  }

  @Get('parse-transaction')
  async parseTransaction(
    @Query('transactionSignature') transactionSignature: string,
  ) {
    return this.sendaiService.parseTransaction(transactionSignature);
  }

  @Get('parse-swap-transaction')
  async parseSwapTransaction(
    @Query('transactionSignature') transactionSignature: string,
  ) {
    return this.sendaiService.parseSwapTransaction(transactionSignature);
  }

  @Get('tokens')
  async getTokens() {
    return this.sendaiService.getTokens();
  }
}
