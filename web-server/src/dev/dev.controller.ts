import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DevService } from './dev.service';
import { Public } from 'src/common/decorator/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreateTokenDto } from 'src/token/dto/req.dto';

@ApiTags('Dev')
@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Public()
  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  create(
    @Body() data: CreateTokenDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('file is required', HttpStatus.BAD_REQUEST);
    }
    return this.devService.create(data, file);
  }

  @Public()
  @Get('check-sdk-connection')
  checkSdkConnection() {
    return this.devService.checkSdkConnection();
  }

  @Public()
  @Get('check-wallet-balance')
  checkWalletBalance() {
    return this.devService.checkWalletBalance();
  }

  @Public()
  @Get('create-bonding-curve-with-pool')
  createBondingCurveWithPool() {
    return this.devService.createBondingCurveWithPool();
  }

  @Public()
  @Get('buy-tokens/:poolAddress')
  buyTokens(@Param('poolAddress') poolAddress: string) {
    const solAmount = 0.01;
    return this.devService.buyTokens(poolAddress, solAmount);
  }

  @Public()
  @Get('sell-tokens/:poolAddress')
  sellTokens(@Param('poolAddress') poolAddress: string) {
    const tokenAmount = 100;
    return this.devService.sellTokens(poolAddress, tokenAmount);
  }

  @Public()
  @Get('get-pools-fees-by-creator/:creatorAddress')
  getPoolsFeesByCreator(@Param('creatorAddress') creatorAddress: string) {
    return this.devService.getPoolsFeesByCreator(creatorAddress);
  }
}
