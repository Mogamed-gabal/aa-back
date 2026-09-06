import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ContentSectionKey = 'hero' | 'about' | 'contact';
export const CONTENT_SECTION_KEYS: readonly ContentSectionKey[] = [
  'hero',
  'about',
  'contact',
];
export type SiteContentData = Record<string, unknown>;

@Entity({ name: 'site_contents' })
export class SiteContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_site_contents_section_key', { unique: true })
  @Column({ type: 'varchar', length: 32 })
  sectionKey!: ContentSectionKey;

  @Column({ type: 'jsonb' })
  data!: SiteContentData;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
