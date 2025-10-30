import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FundIdReqDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '6837e73994eecfa18b4a1e8f',
    description: 'fundId',
    required: false,
  })
  fundId?: string;
}
