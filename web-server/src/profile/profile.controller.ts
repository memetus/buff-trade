import { Controller, Get } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { User, UserAfterAuth } from 'src/common/decorator/user.decorator';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'user profile 조회' })
  getProfile(@User() user: UserAfterAuth) {
    return this.profileService.getProfile(user.id);
  }

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'wallet token balances and portfolio 조회',
  })
  getBalance(@User() user: UserAfterAuth) {
    return this.profileService.getBalance(user.id);
  }

  @Get('token')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Agent Token 조회',
  })
  getToken(@User() user: UserAfterAuth) {
    return this.profileService.getToken(user.id);
  }
}
