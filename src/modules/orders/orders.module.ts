import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymobModule } from '../../shared/paymob/paymob.module';
import { MailModule } from '../../shared/mail/mail.module';
import { Artwork } from '../artworks/entities/artwork.entity';
import { Course } from '../courses/entities/course.entity';
import { AuthModule } from '../auth/auth.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymobHmacGuard } from './guards/paymob-hmac.guard';

@Module({
  imports: [
    AuthModule,
    PaymobModule,
    MailModule,
    TypeOrmModule.forFeature([Order, OrderItem, Artwork, Course]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PaymobHmacGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
