import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorator/public.decorator';
import { BondingCurveService } from './bonding-curve.service';

@ApiTags('Bonding Curve')
@Controller('bonding-curve')
export class BondingCurveController {
  constructor(private readonly bondingCurveService: BondingCurveService) {}

  @Public()
  @Get('config-info/:address')
  @ApiOperation({ summary: 'Config 정보 조회' })
  @ApiResponse({ status: 200, description: 'Config 정보 조회 성공' })
  async getConfigInfo(@Param('address') address: string) {
    return this.bondingCurveService.getConfigInfo(address);
  }

  @Public()
  @Get('pool-info/:address')
  @ApiOperation({ summary: 'Pool 정보 조회' })
  @ApiResponse({ status: 200, description: 'Pool 정보 조회 성공' })
  async getPoolInfo(@Param('address') address: string) {
    return this.bondingCurveService.getPoolInfo(address);
  }

  @Public()
  @Post('pools-info')
  @ApiOperation({ summary: 'Pools 정보 조회' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        addresses: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'GWRzeuUuQfZFPXKF1YEgdKrfezn8fCrvGPYm6GUVhQR3',
            '5t7U3ZowDAjjeGWowiEwHjBHfT2yyw2JBSpiCfzWcDkz',
          ],
        },
      },
      required: ['addresses'],
    },
  })
  @ApiResponse({ status: 200, description: 'Pools 정보 조회 성공' })
  async getPoolsInfo(@Body() body: { addresses: string[] }) {
    return this.bondingCurveService.getPoolsInfo(body.addresses);
  }

  @Public()
  @Get('progress-to-migration/:address')
  @ApiOperation({
    summary: 'Progress to Migration 정보 조회',
    description: 'Progress to Migration 정보 조회',
    parameters: [
      {
        name: 'address',
        in: 'path',
        required: true,
        example: 'Gx9DFMvXQnYuRnYoa98Zfx6Uio239t5ZSzd651Hcd9HR',
      },
    ],
  })
  @ApiResponse({
    status: 200,
    description: 'Progress to Migration 정보 조회 성공',
  })
  async getProgressToMigration(@Param('address') address: string) {
    return this.bondingCurveService.getProgressToMigration(address);
  }

  @Public()
  @Get('market-cap/:address')
  @ApiOperation({ summary: 'Market Cap 정보 조회' })
  @ApiResponse({ status: 200, description: 'Market Cap 정보 조회 성공' })
  async getMarketCap(@Param('address') address: string) {
    return this.bondingCurveService.getMarketCap(address);
  }

  @Public()
  @Post('migration/create-damm-v2-metadata/:poolAddress/:configAddress')
  @ApiOperation({ summary: 'DAMM V2 마이그레이션 메타데이터 생성' })
  @ApiResponse({
    status: 200,
    description: 'DAMM V2 마이그레이션 메타데이터 생성 성공',
  })
  async createDammV2MigrationMetadata(
    @Param('poolAddress') poolAddress: string,
    @Param('configAddress') configAddress: string,
  ) {
    return this.bondingCurveService.createDammV2MigrationMetadata(
      poolAddress,
      configAddress,
    );
  }

  @Public()
  @Post('migration/create-locker/:address')
  @ApiOperation({ summary: 'Locker 생성' })
  @ApiResponse({ status: 200, description: 'Locker 생성 성공' })
  async createLocker(@Param('address') address: string) {
    return this.bondingCurveService.createLocker(address);
  }

  @Public()
  @Post('migration/migrate-to-damm-v2/:poolAddress')
  @ApiOperation({ summary: 'DAMM V2로 마이그레이션' })
  @ApiResponse({ status: 200, description: 'DAMM V2 마이그레이션 성공' })
  async migrateToDammV2(@Param('poolAddress') poolAddress: string) {
    return this.bondingCurveService.migrateToDammV2(poolAddress);
  }

  @Public()
  @Get('migration/damm-v2-pool-address/:poolAddress')
  @ApiOperation({ summary: 'DAMM V2 Pool 주소 조회' })
  @ApiResponse({ status: 200, description: 'DAMM V2 Pool 주소 조회 성공' })
  async getDammV2PoolAddress(@Param('poolAddress') poolAddress: string) {
    return this.bondingCurveService.getDammV2PoolAddress(poolAddress);
  }

  @Public()
  @Post('migration/withdraw-leftover/:address')
  @ApiOperation({ summary: 'Leftover 토큰 출금' })
  @ApiResponse({ status: 200, description: 'Leftover 토큰 출금 성공' })
  async withdrawLeftover(@Param('address') address: string) {
    return this.bondingCurveService.withdrawLeftover(address);
  }

  @Public()
  @Get('migration/handle-migration')
  @ApiOperation({ summary: 'Migration 처리' })
  @ApiResponse({ status: 200, description: 'Migration 처리 성공' })
  async handleMigration() {
    return this.bondingCurveService.handleMigration();
  }

  @Public()
  @Get('trading-fee-info/:poolAddress')
  @ApiOperation({ summary: 'Trading Fee 정보 조회' })
  @ApiResponse({ status: 200, description: 'Trading Fee 정보 조회 성공' })
  async getTradingFeeInfo(@Param('poolAddress') poolAddress: string) {
    return this.bondingCurveService.getTradingFeeInfo(poolAddress);
  }

  @Public()
  @Get('pools-fees-by-creator/:creatorAddress')
  @ApiOperation({ summary: 'Pools Fees by Creator 정보 조회' })
  @ApiResponse({
    status: 200,
    description: 'Pools Fees by Creator 정보 조회 성공',
  })
  async getPoolsFeesByCreator(@Param('creatorAddress') creatorAddress: string) {
    return this.bondingCurveService.getPoolsFeesByCreator(creatorAddress);
  }

  @Public()
  @Post('claim-creator-trading-fee/:poolAddress')
  @ApiOperation({ summary: 'Creator Trading Fee 청구' })
  @ApiResponse({ status: 200, description: 'Creator Trading Fee 청구 성공' })
  async claimCreatorTradingFee(@Param('poolAddress') poolAddress: string) {
    return this.bondingCurveService.claimCreatorTradingFee(poolAddress);
  }

  @Public()
  @Post('claim-partner-trading-fee/:poolAddress')
  @ApiOperation({ summary: 'Partner Trading Fee 청구' })
  @ApiResponse({ status: 200, description: 'Partner Trading Fee 청구 성공' })
  async claimPartnerTradingFee(@Param('poolAddress') poolAddress: string) {
    return this.bondingCurveService.claimPartnerTradingFee(poolAddress);
  }
}
