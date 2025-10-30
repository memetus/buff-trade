import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/req.dto';
import { Users } from 'src/common/schemas/users.schema';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('Users')
    private usersModel: Model<Users>,

    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async create(data: CreateUserDto) {
    const { wallet, timezone } = data;

    const userInfo = await this.usersModel.findOneAndUpdate(
      { wallet },
      { timezone },
      { new: true },
    );

    if (userInfo) {
      return {
        userId: userInfo._id.toString(),
        accessToken: this.generateAccessToken(userInfo._id.toString()),
        createdAt: userInfo.createdAt,
        isInvited: userInfo.isInvited,
      };
    }

    const newUser = {
      wallet,
      timezone,
      isInvited: false,
    };

    const newUserInfo = await this.usersModel.create(newUser);

    return {
      userId: newUserInfo._id.toString(),
      accessToken: this.generateAccessToken(newUserInfo._id.toString()),
      createdAt: newUserInfo.createdAt,
      isInvited: newUserInfo.isInvited,
    };
  }

  async findOne(userId: string) {
    const userInfo = await this.usersModel.findById(userId);

    if (!userInfo) {
      throw new BadRequestException('User not found');
    }

    return userInfo;
  }

  async verifyInvited(inviteCode: string) {
    const configInviteCode = this.configService.get('jwt.inviteCode');

    if (
      inviteCode.trim().toLowerCase() !== configInviteCode.trim().toLowerCase()
    ) {
      throw new BadRequestException('Invalid invite code');
    }

    return {
      isInvited: true,
    };
  }

  private generateAccessToken(userId: string) {
    const payload = { sub: userId, tokenType: 'access' };
    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }
}
