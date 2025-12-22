import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Show } from './show.entity';
import { User } from './user.entity';
import { Seat } from './seat.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

@Entity('bookings')
@Index('IDX_booking_show', ['showId'])
@Index('IDX_booking_user', ['userId'])
@Index('IDX_booking_status', ['status'])
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.bookings, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null = null;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null = null;

  @ManyToOne(() => Show, show => show.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'show_id' })
  show!: Show;

  @Column({ name: 'show_id' })
  showId!: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING
  })
  status: BookingStatus = BookingStatus.PENDING;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'num_seats' })
  numSeats!: number;

  @Column('simple-array', { name: 'seat_numbers', nullable: true })
  seatNumbers: number[] = [];

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName?: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255, nullable: true })
  customerEmail?: string;

  @OneToMany(() => Seat, seat => seat.booking)
  seats!: Seat[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt!: Date;

  @Column({
    name: 'booking_time',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP'
  })
  bookingTime!: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null = null;

  // Helper method to check if booking is active
  isActive(): boolean {
    if (this.status === BookingStatus.CONFIRMED) return true;
    if (this.status === BookingStatus.PENDING) {
      if (this.expiresAt && new Date() > this.expiresAt) return false;
      return true;
    }
    return false;
  }

  // Mark booking as confirmed
  confirm(): void {
    this.status = BookingStatus.CONFIRMED;
  }

  // Cancel the booking
  cancel(): void {
    this.status = BookingStatus.CANCELLED;
  }

  // Mark booking as failed
  markAsFailed(): void {
    this.status = BookingStatus.FAILED;
  }
}
