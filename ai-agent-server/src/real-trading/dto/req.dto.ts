import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSwapDto {
  @ApiProperty({
    description: 'Amount to swap',
    example: '0.001',
  })
  @IsString()
  amount: string;

  @ApiProperty({
    description: 'From token address',
    example: '11111111111111111111111111111111',
  })
  @IsString()
  fromTokenAddress: string;

  @ApiProperty({
    description: 'To token address',
    example: '7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o',
  })
  @IsString()
  toTokenAddress: string;

  @ApiProperty({
    description: 'Slippage percentage',
    required: false,
    example: '5',
  })
  @IsString()
  @IsOptional()
  slippage?: string = '5';
}

export class ParseSignatureDto {
  @IsString()
  @IsNotEmpty()
  signature: string;
}
