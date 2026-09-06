import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from './course.entity';

@Entity({ name: 'course_steps' })
export class CourseStep {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Course, (course) => course.steps, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course!: Course;
  @Column({ type: 'int' }) stepOrder!: number;
  @Column({ type: 'varchar', length: 1000 }) imageUrl!: string;
  @Column({ length: 500 }) captionAr!: string;
  @Column({ length: 500 }) captionEn!: string;
}
