import { IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ADDRESS_PATTERN } from './content';

export class PublishSiteDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @Matches(ADDRESS_PATTERN, { message: 'Use a small-web address such as tidepool.zz.' })
  address!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120)
  title!: string;

  @IsString() @MinLength(1) @MaxLength(100_000)
  html!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  authorId!: string;
}

export class RecordVisitDto {
  @IsUUID('4')
  id!: string;

  @IsString() @MinLength(1) @MaxLength(80)
  personId!: string;

  @Matches(ADDRESS_PATTERN)
  address!: string;

  @IsString() @MaxLength(120)
  title!: string;

  @IsIn(['typed', 'link', 'back', 'forward', 'history', 'search'])
  source!: 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search';

  @IsIn(['found', 'missing'])
  outcome!: 'found' | 'missing';
}
