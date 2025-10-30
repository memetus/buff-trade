import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class StrategyIdReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '676f268b3461e14ee8459d2d',
    description: 'commentId',
    required: true,
  })
  strategyId: string;
}

export class PageReqDto {
  @ApiPropertyOptional({
    example: 1,
  })
  @Transform((Param) => Number(Param.value))
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
  })
  @Transform((Param) => Number(Param.value))
  @IsInt()
  pageSize?: number = 10;
}

export class TokenAddressReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o',
    description: 'meta data by token address',
    required: true,
  })
  tokenAddress: string;
}

export class FundIdReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '68be8795df7802639a7d1fd3',
    required: true,
  })
  fundId: string;
}
