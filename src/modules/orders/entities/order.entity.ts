import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EOrderType,
  EOrderStatus,
  ECurrencySymbol,
} from '../../../core/enums/order.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uniqueidentifier', name: 'user_id' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'order_type',
    enum: EOrderType,
  })
  orderType: EOrderType;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'currency_symbol',
    enum: ECurrencySymbol,
  })
  currencySymbol: ECurrencySymbol;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  quantity: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: EOrderStatus,
    default: EOrderStatus.OPEN,
  })
  status: EOrderStatus;

  @CreateDateColumn({ type: 'datetimeoffset', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetimeoffset', name: 'updated_at' })
  updatedAt: Date;
}
