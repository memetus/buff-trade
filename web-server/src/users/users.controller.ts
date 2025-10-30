import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, VerifyInvitedDto } from './dto/req.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorator/public.decorator';
import { User, UserAfterAuth } from 'src/common/decorator/user.decorator';

@ApiTags('Users')
@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'log in wallet user' })
  create(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  @ApiBearerAuth()
  @Get('detail')
  @ApiOperation({ summary: 'login user 정보' })
  findOne(@User() user: UserAfterAuth) {
    return this.usersService.findOne(user.id);
  }

  @Public()
  @Post('verify-invited')
  @ApiOperation({ summary: 'verify invited code' })
  verifyInvited(@Body() data: VerifyInvitedDto) {
    return this.usersService.verifyInvited(data.inviteCode);
  }
}
