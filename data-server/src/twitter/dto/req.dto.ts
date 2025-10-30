import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CONSTANTS } from 'src/common/config/constants';

export class ListIdReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: CONSTANTS.LISTS_ID.KOL_LIST,
    description: 'List ID',
    required: true,
  })
  listId: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    example: CONSTANTS.LIMIT.KOL_LIST,
    description: 'Limit',
    required: true,
  })
  limit: number;
}

export class UsernameReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: 'homo_memetus',
    description: 'handle',
    required: true,
  })
  username: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    example: CONSTANTS.LIMIT.TWEETS,
    description: 'Limit',
    required: true,
  })
  limit: number;
}

export class QueryReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '$homo',
    description: 'Query',
    required: true,
  })
  query: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    example: CONSTANTS.LIMIT.TWEETS,
    description: 'Limit',
    required: true,
  })
  limit: number;
}

export class KolNameDto {
  @IsString()
  @ApiProperty({
    description: 'Name of the KOL',
    example: 'Defi0xJeff',
  })
  kolName: string;
}

export class CreateKolPoolDto {
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    description: 'Category of the KOL',
    example: ['solana'],
  })
  categories: string[];
}
