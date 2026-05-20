import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ECurrencySymbol } from '../../../core/enums/order.enum';

@Entity('balances')
@Unique(['userId', 'currencySymbol'])
export class Balance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uniqueidentifier', name: 'user_id' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'currency_symbol',
    enum: ECurrencySymbol,
  })
  currencySymbol: ECurrencySymbol;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: '0.00000000',
  })
  balance: string;

  @CreateDateColumn({ type: 'datetimeoffset', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetimeoffset', name: 'updated_at' })
  updatedAt: Date;
}
