import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UserIdReqDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '676e674ccf22e1d3ed0155e2',
    description: 'userId',
    required: false,
  })
  userId?: string;
}
