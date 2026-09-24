import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient } from 'mongodb';

export interface Person {
  _id: string;
  name: string;
  color: string;
}
export interface Site {
  address: string;
  title: string;
  html: string;
  text: string;
  authorId: string;
  publishedAt: string;
}
export interface Visit {
  _id: string;
  personId: string;
  address: string;
  title: string;
  source: 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search';
  outcome: 'found' | 'missing';
  visitedAt: string;
}

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly client = new MongoClient(
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    {
      serverSelectionTimeoutMS: 30_000,
    },
  );
  private readonly db = this.client.db(process.env.MONGODB_DATABASE ?? 'small_web');
  readonly people = this.db.collection<Person>('people');
  readonly sites = this.db.collection<Site>('sites');
  readonly visits = this.db.collection<Visit>('visits');

  async onModuleInit() {
    await this.client.connect();
    await Promise.all([
      this.sites.createIndex({ address: 1 }, { unique: true }),
      this.sites.createIndex({ title: 'text', text: 'text' }, { weights: { title: 3, text: 1 } }),
      this.visits.createIndex({ personId: 1, visitedAt: -1, _id: -1 }),
    ]);
  }

  async onModuleDestroy() {
    await this.client.close();
  }
}
