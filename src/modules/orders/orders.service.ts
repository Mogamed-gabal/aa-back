import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MailService } from '../../shared/mail/mail.service';
import {
  PaymobService,
  type PaymobWebhookPayload,
} from '../../shared/paymob/paymob.service';
import { Artwork, ArtworkStatus } from '../artworks/entities/artwork.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem, OrderItemType } from './entities/order-item.entity';

function primitiveString(value: unknown): string {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : '';
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,
    @InjectRepository(Artwork)
    private readonly artworkRepository: Repository<Artwork>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly paymob: PaymobService,
    private readonly mail: MailService,
  ) {}

  async create(
    dto: CreateOrderDto,
  ): Promise<{ order: Order; checkoutUrl: string }> {
    if (dto.items.length === 0)
      throw new BadRequestException('At least one order item is required');
    const hasCourse = dto.items.some((item) => item.courseId !== undefined);
    if (hasCourse && !dto.email)
      throw new BadRequestException(
        'Email is required when purchasing a course',
      );
    for (const item of dto.items)
      if ((item.artworkId ? 1 : 0) + (item.courseId ? 1 : 0) !== 1)
        throw new BadRequestException(
          'Each order item must contain exactly one artworkId or courseId',
        );
    let order!: Order;
    try {
      order = await this.dataSource.transaction(async (manager) => {
        const items: OrderItem[] = [];
        for (const input of dto.items) {
          if (input.courseId) {
            const course = await manager
              .getRepository(Course)
              .findOne({ where: { id: input.courseId, isPublished: true } });
            if (!course)
              throw new NotFoundException(`Course ${input.courseId} not found`);
            const price =
              course.onSale && course.discountPrice !== null
                ? course.discountPrice
                : course.price;
            items.push(
              manager.getRepository(OrderItem).create({
                course,
                artwork: null,
                itemType: OrderItemType.COURSE,
                quantity: input.quantity,
                price,
              }),
            );
            continue;
          }
          const artwork = await manager
            .getRepository(Artwork)
            .createQueryBuilder('artwork')
            .where('artwork.id = :id', { id: input.artworkId })
            .setLock('pessimistic_write')
            .getOne();
          if (!artwork)
            throw new NotFoundException(`Artwork ${input.artworkId} not found`);
          if (
            artwork.status !== ArtworkStatus.AVAILABLE ||
            artwork.quantity < input.quantity
          )
            throw new BadRequestException(
              `Artwork ${input.artworkId} is unavailable or has insufficient stock`,
            );
          artwork.quantity -= input.quantity;
          artwork.status =
            artwork.quantity === 0
              ? ArtworkStatus.SOLD_OUT
              : ArtworkStatus.AVAILABLE;
          await manager.getRepository(Artwork).save(artwork);
          const price =
            artwork.onSale && artwork.discountPrice !== null
              ? artwork.discountPrice
              : artwork.price;
          items.push(
            manager.getRepository(OrderItem).create({
              artwork,
              course: null,
              itemType: OrderItemType.ARTWORK,
              quantity: input.quantity,
              price,
            }),
          );
        }
        const total = items
          .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
          .toFixed(2);
        return manager.getRepository(Order).save(
          manager.getRepository(Order).create({
            orderNumber: `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`,
            customerName: dto.customerName,
            phone: dto.phone,
            whatsappPhone: dto.whatsappPhone ?? null,
            email: dto.email ?? null,
            shippingAddress: dto.shippingAddress,
            preferredDeliveryDate: dto.preferredDeliveryDate ?? null,
            totalAmount: total,
            paymentStatus: PaymentStatus.PENDING,
            orderStatus: OrderStatus.PROCESSING,
            paymobOrderId: null,
            paymobTransactionId: null,
            courseEmailSentAt: null,
            items,
          }),
        );
      });
      const payment = await this.paymob.createPayment(
        order.orderNumber,
        order.totalAmount,
        order.email,
        order.customerName,
      );
      order.paymobOrderId = payment.paymobOrderId;
      await this.orderRepository.save(order);
      return { order, checkoutUrl: payment.checkoutUrl };
    } catch (error) {
      if (order?.id) await this.releaseStock(order.id);
      throw error;
    }
  }

  async handleWebhook(payload: PaymobWebhookPayload): Promise<void> {
    if (!this.paymob.verifyHmac(payload))
      throw new BadRequestException('Invalid Paymob HMAC');
    const obj = payload.obj;
    const paymobOrderId = primitiveString(obj?.order?.id ?? payload.order_id);
    const transactionId = primitiveString(obj?.id);
    const order = await this.orderRepository.findOne({
      where: { paymobOrderId },
      relations: { items: { artwork: true, course: true } },
    });
    if (!order) return;
    const isCourseOrder = order.items.some(
      (item) => item.itemType === OrderItemType.COURSE,
    );
    if (
      order.paymentStatus === PaymentStatus.PAID &&
      (!isCourseOrder || order.courseEmailSentAt)
    )
      return;
    order.paymobTransactionId = transactionId || order.paymobTransactionId;
    if (obj?.success === true || obj?.success === 'true') {
      order.paymentStatus = PaymentStatus.PAID;
      order.orderStatus = OrderStatus.PROCESSING;
      await this.orderRepository.save(order);
      if (isCourseOrder && !order.courseEmailSentAt)
        await this.deliverCourses(order);
    } else if (order.paymentStatus !== PaymentStatus.PAID) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);
      await this.releaseStock(order.id);
    }
  }

  async findAll(
    query: OrderQueryDto,
  ): Promise<{ items: Order[]; meta: object }> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.artwork', 'artwork')
      .leftJoinAndSelect('item.course', 'course')
      .orderBy('order.created_at', 'DESC');
    if (query.paymentStatus)
      qb.andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    if (query.orderStatus)
      qb.andWhere('order.order_status = :orderStatus', {
        orderStatus: query.orderStatus,
      });
    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: { artwork: true, course: true } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    if (
      dto.orderStatus === OrderStatus.CANCELLED &&
      order.paymentStatus !== PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.CANCELLED
    ) {
      await this.releaseStock(order.id);
      order.paymentStatus = PaymentStatus.CANCELLED;
    }
    order.orderStatus = dto.orderStatus;
    return this.orderRepository.save(order);
  }

  private async deliverCourses(order: Order): Promise<void> {
    if (!order.email)
      throw new BadRequestException('Paid course order has no email address');
    for (const item of order.items.filter(
      (entry) => entry.itemType === OrderItemType.COURSE && entry.course,
    ))
      await this.mail.sendCourseDelivery({
        customerName: order.customerName,
        email: order.email,
        orderNumber: order.orderNumber,
        courseTitle: item.course!.titleEn,
        driveFolderUrl: item.course!.driveFolderUrl,
        amount: item.price,
      });
    order.courseEmailSentAt = new Date();
    await this.orderRepository.save(order);
  }

  private async releaseStock(orderId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({
        where: { id: orderId },
        relations: { items: { artwork: true } },
      });
      if (!order || order.paymentStatus === PaymentStatus.PAID) return;
      for (const item of order.items) {
        if (!item.artwork || item.itemType !== OrderItemType.ARTWORK) continue;
        const artwork = await manager
          .getRepository(Artwork)
          .createQueryBuilder('artwork')
          .where('artwork.id = :id', { id: item.artwork.id })
          .setLock('pessimistic_write')
          .getOne();
        if (artwork) {
          artwork.quantity += item.quantity;
          artwork.status = ArtworkStatus.AVAILABLE;
          await manager.getRepository(Artwork).save(artwork);
        }
      }
      order.paymentStatus = PaymentStatus.FAILED;
      await manager.getRepository(Order).save(order);
    });
  }
}
