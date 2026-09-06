import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Artwork } from '../../artworks/entities/artwork.entity';
import { Course } from '../../courses/entities/course.entity';
import { Order } from './order.entity';

export enum OrderItemType {
  ARTWORK = 'ARTWORK',
  COURSE = 'COURSE',
}

@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;
  @ManyToOne(() => Artwork, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'artwork_id' })
  artwork!: Artwork | null;
  @ManyToOne(() => Course, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' })
  course!: Course | null;
  @Column({ type: 'enum', enum: OrderItemType }) itemType!: OrderItemType;
  @Column({ type: 'int' }) quantity!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) price!: string;
}
