import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
@Module({ imports: [BookingModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
