import { ApiProperty } from '@nestjs/swagger';

export class SortQueryReqDto {
  @ApiProperty({
    required: false,
    description: 'topMc, totalPnL, graduated, age',
    example: 'topMc',
    type: String,
  })
  sort?: string;
}

export class SortOrderReqDto {
  @ApiProperty({
    required: false,
    description: 'asc, desc',
    example: 'desc',
    type: String,
  })
  sortOrder?: string;
}

export class SearchReqDto {
  @ApiProperty({
    required: true,
    description: 'search',
    type: String,
  })
  search: string;
}

export class TokenSymbolReqDto {
  @ApiProperty({
    required: false,
    description: 'token symbol',
    example: 'Bucky',
    type: String,
  })
  symbol?: string;
}

export class TokenCAReqDto {
  @ApiProperty({
    required: false,
    description: 'token address',
    example: 'FyrBf5xKg5EwKZ9pHvSpJeLLuCWBicTpm3VvZcsibonk',
    type: String,
  })
  ca?: string;
}

export class CategoryReqDto {
  @ApiProperty({
    required: false,
    description: 'category',
    example: 'TRENCH',
    type: String,
  })
  category?: string;
}

export class TransactionSignatureReqDto {
  @ApiProperty({
    required: true,
    description: 'transaction signature',
    example:
      '33kpwmf29wzQAPMkuCq5J34SuDmF7H2HBXFHSuMb99ptvk9uhtULK81zhowFmiDxtGVHJzT62DWNVhxHxPxSt1vX',
    type: String,
  })
  transactionSignature: string;
}
