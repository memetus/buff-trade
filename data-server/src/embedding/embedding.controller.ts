import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VectorSearchDto } from './dto/req.dto';
import { EmbeddingService } from './embedding.service';

@ApiTags('embedding')
@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Get('create-embedding/trend-token')
  createEmbeddingsTrendToken() {
    return this.embeddingService.createEmbeddingsTrendToken();
  }

  @Get('create-embedding/kol-pool')
  createdEmbeddingsKolPool() {
    return this.embeddingService.createdEmbeddingsKolPool();
  }

  @Get('create-embedding/coin-price')
  createEmbeddingsCoinPrice() {
    return this.embeddingService.createEmbeddingsCoinPrice();
  }

  @Post('vector-search')
  vectorSearchQuery(@Body() { query, type }: VectorSearchDto) {
    return this.embeddingService.vectorSearchQuery(query, type);
  }
}
