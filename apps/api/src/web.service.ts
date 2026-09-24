import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { Database, Site } from './database';
import { cleanHtml, normalizeAddress, visibleText } from './content';
import { PublishSiteDto, RecordVisitDto } from './dto';

@Injectable()
export class WebService {
  constructor(private readonly database: Database) {}

  async people() {
    return (await this.database.people.find().sort({ name: 1 }).toArray()).map(
      ({ _id, ...person }) => ({ id: _id, ...person }),
    );
  }

  async directory() {
    return this.database.sites
      .find({}, { projection: { _id: 0, html: 0, text: 0 } })
      .sort({ publishedAt: -1, address: 1 })
      .limit(100)
      .toArray();
  }

  async site(input: string) {
    const address = normalizeAddress(input);
    if (!address) throw new BadRequestException('Use an address such as tidepool.zz.');
    const site = await this.database.sites.findOne(
      { address },
      { projection: { _id: 0, text: 0 } },
    );
    if (!site) throw new NotFoundException('Nobody has published at this address yet.');
    return site;
  }

  async search(input: string) {
    const query = input.trim();
    if (!query || query.length > 200)
      throw new BadRequestException('Search needs 1–200 characters.');
    const sites = await this.database.sites
      .find<Site & { score: number }>(
        { $text: { $search: query } },
        {
          projection: { _id: 0, html: 0, score: { $meta: 'textScore' } },
        },
      )
      .sort({ score: { $meta: 'textScore' }, address: 1 })
      .toArray();
    const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    return sites.map(({ text, score: _score, ...site }) => {
      const matches = terms
        .map((term) => text.toLowerCase().indexOf(term))
        .filter((index) => index >= 0);
      const start = Math.max(0, (matches.length ? Math.min(...matches) : 0) - 55);
      return {
        ...site,
        excerpt: `${start ? '…' : ''}${text.slice(start, start + 230)}${text.length > start + 230 ? '…' : ''}`,
      };
    });
  }

  private async requirePerson(personId: string) {
    if (!(await this.database.people.findOne({ _id: personId })))
      throw new NotFoundException('Choose a person from the list.');
  }

  async publish(input: PublishSiteDto) {
    await this.requirePerson(input.authorId);
    const html = cleanHtml(input.html);
    const text = visibleText(html);
    if (!text) throw new BadRequestException('Add some readable text to your page.');
    const site = { ...input, html, text, publishedAt: new Date().toISOString() };
    try {
      await this.database.sites.insertOne(site);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('That address already belongs to a site. Try another.');
      }
      throw error;
    }
    return this.site(input.address);
  }

  async recordVisit(input: RecordVisitDto) {
    await this.requirePerson(input.personId);
    const { id, ...visit } = input;
    // Retries keep one arrival: the client creates the id when a page is shown.
    await this.database.visits.updateOne(
      { _id: id, personId: input.personId },
      {
        $setOnInsert: { ...visit, visitedAt: new Date().toISOString() },
      },
      { upsert: true },
    );
    return { id };
  }

  async history(personId: string, cursor?: string) {
    await this.requirePerson(personId);
    let after: { visitedAt: string; id: string } | undefined;
    if (cursor) {
      try {
        after = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (
          !after ||
          typeof after.id !== 'string' ||
          typeof after.visitedAt !== 'string' ||
          Number.isNaN(Date.parse(after.visitedAt))
        )
          throw new Error();
      } catch {
        throw new BadRequestException('Invalid history cursor.');
      }
    }
    const visits = await this.database.visits
      .find({
        personId,
        ...(after
          ? {
              $or: [
                { visitedAt: { $lt: after.visitedAt } },
                { visitedAt: after.visitedAt, _id: { $lt: after.id } },
              ],
            }
          : {}),
      })
      .sort({ visitedAt: -1, _id: -1 })
      .limit(31)
      .toArray();
    const page = visits.slice(0, 30);
    const last = page.at(-1);
    return {
      items: page.map(({ _id, ...visit }) => ({ id: _id, ...visit })),
      nextCursor:
        visits.length > 30 && last
          ? Buffer.from(JSON.stringify({ visitedAt: last.visitedAt, id: last._id })).toString(
              'base64url',
            )
          : null,
    };
  }
}
