import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { PaymobHmacGuard } from './guards/paymob-hmac.guard';
import { OrdersService } from './orders.service';
import { type PaymobWebhookPayload } from '../../shared/paymob/paymob.service';

@ApiBearerAuth('access-token')
@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create checkout order and reserve artwork stock' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Post('webhook/paymob')
  @UseGuards(PaymobHmacGuard)
  @ApiOperation({ summary: 'Receive verified Paymob transaction callback' })
  webhook(@Body() payload: PaymobWebhookPayload) {
    return this.ordersService.handleWebhook(payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
