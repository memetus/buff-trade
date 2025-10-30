import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAgentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token creator',
    example: '2WPLqvAnvg9XPBEkADFXq6arNQFo6GLQiR2gXC5ehe2c',
    type: String,
  })
  creator: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token name',
    example: 'Bucky token',
    type: String,
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token ticker',
    example: 'Bucky',
    type: String,
  })
  ticker: string;

  @ApiProperty({
    description: 'file',
    type: 'string',
    format: 'binary',
    required: true,
  })
  file: any;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token strategy',
    example: 'Bucky token strategy',
    type: String,
  })
  strategyPrompt: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'token website',
    example: 'https://bucky.com',
    type: String,
  })
  website?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'token twitter',
    example: 'https://twitter.com/bucky',
    type: String,
  })
  twitter?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    description: 'token telegram',
    example: 'https://t.me/bucky',
    type: String,
  })
  telegram?: string;
}

export class RemoveAgentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token id',
    example: '68b418caccf355d4789dafaf',
    type: String,
  })
  tokenId: string;
}

export class CreateTokenDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'tokenId',
    example: '68b418cacfbef7489466d057',
    type: String,
  })
  tokenId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token address',
    example: '5tZgFX49msXiEKcacJdvi9CRtMaL1ffhR26HU1QuHM3t',
    type: String,
  })
  tokenAddress: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'bonding curve pool address',
    example: '5poRCYmMjcWcqLLvh7EyqFbQYx1f8Z6x6UTkBVMcf6pG',
    type: String,
  })
  bondingCurvePool: string;
}

export class TokenTransactionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'fund id',
    example: '68ca3c2be725fbcc4f4cd5f2',
    type: String,
  })
  fundId: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token ticker',
    example: 'Bucky',
    type: String,
  })
  tokenTicker: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'token address',
    example: '5tZgFX49msXiEKcacJdvi9CRtMaL1ffhR26HU1QuHM3t',
    type: String,
  })
  tokenAddress: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    required: true,
    description: 'type',
    example: 'buy',
    type: String,
  })
  type: 'buy' | 'sell';

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    required: true,
    description: 'sol amount',
    example: 1,
    type: Number,
  })
  solAmount: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({
    required: true,
    description: 'token amount',
    example: 100000,
    type: Number,
  })
  tokenAmount: number;
}
