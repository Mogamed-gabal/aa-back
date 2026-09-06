import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { ArtworkImage } from './artwork-image.entity';

export enum ArtworkStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD_OUT = 'SOLD_OUT',
}

@Entity({ name: 'artworks' })
export class Artwork {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  titleAr!: string;

  @Column({ type: 'varchar', length: 180 })
  titleEn!: string;

  @Column({ type: 'text' })
  storyAr!: string;

  @Column({ type: 'text' })
  storyEn!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountPrice!: string | null;

  @Column({ type: 'boolean', default: false })
  onSale!: boolean;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'boolean', default: false })
  isBestSeller!: boolean;

  @Column({
    type: 'enum',
    enum: ArtworkStatus,
    default: ArtworkStatus.AVAILABLE,
  })
  status!: ArtworkStatus;

  @ManyToOne(() => Category, (category) => category.artworks, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @OneToMany(() => ArtworkImage, (image) => image.artwork, {
    cascade: true,
    eager: false,
  })
  images!: ArtworkImage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
