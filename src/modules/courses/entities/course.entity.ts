import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseStep } from './course-step.entity';

@Entity({ name: 'courses' })
export class Course {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 180 }) titleAr!: string;
  @Column({ length: 180 }) titleEn!: string;
  @Column({ type: 'text' }) descriptionAr!: string;
  @Column({ type: 'text' }) descriptionEn!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) price!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountPrice!: string | null;
  @Column({ default: false }) onSale!: boolean;
  @Column({ length: 80 }) duration!: string;
  @Column({ type: 'int', default: 0 }) videoCount!: number;
  @Column({ type: 'varchar', length: 500 }) demoVideoUrl!: string;
  @Column({ type: 'varchar', length: 1000 }) driveFolderUrl!: string;
  @Column({ type: 'varchar', length: 1000 }) coverImageUrl!: string;
  @Column({ default: true }) isPublished!: boolean;
  @OneToMany(() => CourseStep, (step) => step.course, {
    cascade: true,
    eager: true,
  })
  steps!: CourseStep[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}
