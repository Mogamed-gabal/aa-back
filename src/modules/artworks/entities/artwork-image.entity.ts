import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Artwork } from './artwork.entity';

@Entity({ name: 'artwork_images' })
export class ArtworkImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'varchar', length: 255 })
  publicId!: string;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @ManyToOne(() => Artwork, (artwork) => artwork.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'artwork_id' })
  artwork!: Artwork;
}
