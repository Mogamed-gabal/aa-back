import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
export enum OrderStatus {
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true, length: 32 }) orderNumber!: string;
  @Column({ length: 180 }) customerName!: string;
  @Column({ length: 40 })
  phone!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  whatsappPhone!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;
  @Column({ type: 'text' }) shippingAddress!: string;
  @Column({ type: 'date', nullable: true }) preferredDeliveryDate!:
    string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) totalAmount!: string;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PROCESSING })
  orderStatus!: OrderStatus;
  @Index()
  @Column({ type: 'varchar', nullable: true })
  paymobOrderId!: string | null;
  @Column({ type: 'varchar', nullable: true }) paymobTransactionId!:
    string | null;
  @Column({ type: 'timestamptz', nullable: true })
  courseEmailSentAt!: Date | null;
  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items!: OrderItem[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}
