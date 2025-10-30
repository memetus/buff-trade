import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { TokenService } from './token.service';
import {
  CreateAgentDto,
  CreateTokenDto,
  RemoveAgentDto,
  TokenTransactionDto,
} from './dto/req.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorator/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { User, UserAfterAuth } from 'src/common/decorator/user.decorator';

@ApiTags('Token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Public()
  @Post('create-agent')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'create AI Agent Token' })
  create(
    @Body() data: CreateAgentDto,

    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    return this.tokenService.createAgent(data, file);
  }

  @Public()
  @Post('create-token')
  @ApiOperation({ summary: 'create Token' })
  createToken(@Body() data: CreateTokenDto) {
    return this.tokenService.createToken(data);
  }

  @Public()
  @Post('remove-agent')
  removeAgent(@Body() data: RemoveAgentDto) {
    return this.tokenService.removeAgent(data.tokenId);
  }

  @ApiBearerAuth()
  @Post('save-token-transaction')
  saveTokenTransaction(
    @Body() data: TokenTransactionDto,
    @User() user: UserAfterAuth,
  ) {
    return this.tokenService.saveTokenTransaction(data, user.id);
  }

  @Public()
  @Get('transaction-ticker')
  @ApiOperation({ summary: 'get transaction ticker' })
  getTransactionTicker() {
    return this.tokenService.getTransactionTicker();
  }

  @Public()
  @Get('random-strategy')
  @ApiOperation({ summary: 'get random strategy prompt' })
  getRandomStrategyPrompt() {
    return this.tokenService.getRandomStrategyPrompt();
  }
}
