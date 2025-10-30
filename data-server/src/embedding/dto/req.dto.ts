import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VectorSearchDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'Invest in trending memecoins',
    required: true,
  })
  query: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'coinPrice',
    required: true,
  })
  type: string;
}

export class CreateEmbeddingDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'coinPrice',
    description: 'coinPrice, coinData',
    required: true,
  })
  type: string;
}
