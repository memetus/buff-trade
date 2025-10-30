import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateKolPoolDto,
  KolNameDto,
  ListIdReqDto,
  QueryReqDto,
  UsernameReqDto,
} from './dto/req.dto';

@ApiTags('Twitter')
@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  @Get('scraper')
  scraper() {
    return this.twitterService.getScraper();
  }

  @Get('twitter-login')
  login() {
    return this.twitterService.twitterLogin();
  }

  @Get('is-logged-in')
  isLoggedIn() {
    return this.twitterService.isLoggedInStatus();
  }

  @Get('get-tweets')
  getTweets(@Query() { username, limit }: UsernameReqDto) {
    return this.twitterService.getTweets(username, limit);
  }

  @Get('search-tweets')
  searchTweets(@Query() { query, limit }: QueryReqDto) {
    return this.twitterService.searchTweets(query, limit);
  }

  @Get('fetch-list-tweets')
  fetchListTweets(@Query() { listId, limit }: ListIdReqDto) {
    return this.twitterService.fetchListTweets(listId, limit);
  }

  @Get('get-user-profile')
  getUserProfile(@Query() { username }: UsernameReqDto) {
    return this.twitterService.getUserProfile(username);
  }

  @Get('timeline-kol/:kolName')
  @ApiOperation({ summary: 'get timeline by kol' })
  getTimelineByKol(@Param() { kolName }: KolNameDto) {
    return this.twitterService.getTimelineByKol(kolName);
  }

  @Post('new-kol/:kolName')
  @ApiOperation({ summary: 'set new kol into kol pool' })
  setNewKolPool(
    @Param() { kolName }: KolNameDto,
    @Body() { categories }: CreateKolPoolDto,
  ) {
    return this.twitterService.setNewKolPool(kolName, categories);
  }

  @Get('get-profile-by-kol')
  getProfileByKol() {
    return this.twitterService.getProfileByKol();
  }

  @Get('get-keyword-by-kol')
  getKeywordByKol() {
    return this.twitterService.getKeywordByKol();
  }

  @Get('get-category-by-twitter')
  getCategoryByTwitter() {
    return this.twitterService.getCategoryByTwitter();
  }
}
