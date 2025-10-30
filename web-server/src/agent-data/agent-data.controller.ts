import { Controller, Get, Param, Query } from '@nestjs/common';
import { AgentDataService } from './agent-data.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorator/public.decorator';
import { FundIdReqDto, PageReqDto } from 'src/common/dto/req.dto';
import { SearchReqDto, SortOrderReqDto, SortQueryReqDto } from './dto/req.dto';

@ApiTags('AgentData')
@Controller('agent-data')
export class AgentDataController {
  constructor(private readonly agentDataService: AgentDataService) {}

  @Public()
  @Get('agent-metadata/:fundId')
  getAiMetaData(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getAiMetaData(fundId);
  }

  @Public()
  @Get('agent-stat/:fundId')
  getAgentStatByFundId(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getAgentStatByFundId(fundId);
  }

  @Public()
  @Get('top-portfolios/:fundId')
  getTopPicsByFundId(
    @Param() { fundId }: FundIdReqDto,
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getTopPicsByFundId(fundId, page, pageSize);
  }

  @Public()
  @Get('graph/:fundId')
  getRealTradingGraph(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getRealTradingGraphByFundId(fundId);
  }

  @Public()
  @Get('activity/:fundId')
  getActivityByFundId(
    @Param() { fundId }: FundIdReqDto,
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getActivityByFundId(fundId, page, pageSize);
  }

  @Public()
  @Get('portfolio/:fundId')
  getHoldingsByFundId(
    @Param() { fundId }: FundIdReqDto,
    @Query() { sort }: SortQueryReqDto,
    @Query() { sortOrder }: SortOrderReqDto,
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getHoldingsByFundId(
      fundId,
      page,
      pageSize,
      sort,
      sortOrder,
    );
  }

  @Public()
  @Get('agent-card/:fundId')
  getAgentCardByFundId(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getAgentCardByFundId(fundId);
  }

  @Public()
  @Get('token-transactions/:fundId')
  getTransactionsByFundId(
    @Param() { fundId }: FundIdReqDto,
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getTransactionsByFundId(
      fundId,
      page,
      pageSize,
    );
  }

  @Public()
  @Get('token-holders/:fundId')
  getHoldersByFundId(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getHoldersByFundId(fundId);
  }

  @Public()
  @Get('agent-dashboard')
  getAiDashboard(
    @Query() { sort }: SortQueryReqDto,
    @Query() { sortOrder }: SortOrderReqDto,
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getAiDashboard(
      page,
      pageSize,
      sort,
      sortOrder,
    );
  }

  @Public()
  @Get('agent-dashboard/trending-tokens')
  getTrendingTokens(
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
  ) {
    return this.agentDataService.getTrendingTokens(page, pageSize);
  }

  @Public()
  @Get('agent-dashboard/search')
  getSearchTopPics(@Query() { search }: SearchReqDto) {
    return this.agentDataService.getSearchTopPics(search);
  }

  @Public()
  @Get('agent-dashboard/:fundId')
  getAiDashboardByFundId(@Param() { fundId }: FundIdReqDto) {
    return this.agentDataService.getAiDashboardByFundId(fundId);
  }

  @Public()
  @Get('update-market-cap')
  updateMarketCap() {
    return this.agentDataService.updateMarketCap();
  }

  @Public()
  @Get('trending')
  getTrending(
    @Query() { page }: PageReqDto,
    @Query() { pageSize }: PageReqDto,
    @Query() { sort }: SortQueryReqDto,
    @Query() { sortOrder }: SortOrderReqDto,
  ) {
    return this.agentDataService.getTrending(
      page,
      pageSize,
      sort as 'totalPnL' | 'age' | 'topMc',
      sortOrder as 'asc' | 'desc',
    );
  }
}
