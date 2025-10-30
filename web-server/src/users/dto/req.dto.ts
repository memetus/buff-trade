import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '2WPLqvAnvg9XPBEkADFXq6arNQFo6GLQiR2gXC5ehe2c',
    required: true,
  })
  wallet: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Asia/Seoul',
    required: true,
  })
  timezone: string;
}

export class VerifyInvitedDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '12345',
    required: true,
  })
  inviteCode: string;
}
