import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Artwork } from './artwork.entity';

@Entity({ name: 'artwork_categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nameAr!: string;

  @Column({ type: 'varchar', length: 120 })
  nameEn!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @OneToMany(() => Artwork, (artwork) => artwork.category)
  artworks!: Artwork[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
