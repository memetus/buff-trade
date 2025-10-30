import { Controller, Get } from '@nestjs/common';
import { VirtualTradingService } from './virtual-trading.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Virtual Trading')
@Controller('virtual-trading')
export class VirtualTradingController {
  constructor(private readonly virtualTradingService: VirtualTradingService) {}

  @Get()
  executeVirtualTrading() {
    return this.virtualTradingService.executeVirtualTrading();
  }
}
