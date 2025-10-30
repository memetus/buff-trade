import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QueryReqDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    example: '$homo',
    description: 'Query',
    required: true,
  })
  query: string;
}
