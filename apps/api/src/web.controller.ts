import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PublishSiteDto, RecordVisitDto } from './dto';
import { WebService } from './web.service';

@Controller()
export class WebController {
  constructor(private readonly web: WebService) {}

  @Get('health') health() { return { status: 'ok' }; }
  @Get('people') people() { return this.web.people(); }
  @Get('sites') directory() { return this.web.directory(); }
  @Get('search') search(@Query('q') query = '') { return this.web.search(query); }
  @Get('sites/:address') site(@Param('address') address: string) { return this.web.site(address); }
  @Post('sites') publish(@Body() body: PublishSiteDto) { return this.web.publish(body); }
  @Post('visits') visit(@Body() body: RecordVisitDto) { return this.web.recordVisit(body); }
  @Get('people/:id/history') history(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.web.history(id, cursor);
  }
}
