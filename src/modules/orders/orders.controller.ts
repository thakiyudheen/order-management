import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { IOrder } from '../../core/interfaces/order.interface';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async placeOrder(@Body() dto: CreateOrderDto): Promise<IOrder> {
    return this.ordersService.placeOrder(dto);
  }

  @Get('user/:userId')
  async findOrdersByUser(@Param('userId') userId: string): Promise<IOrder[]> {
    return this.ordersService.findOrdersByUser(userId);
  }
}
