import { IsString, IsEmail, IsInt, Min, IsNotEmpty, IsArray } from 'class-validator';

export class CreateBookingDto {
    @IsInt()
    @Min(1)
    showId!: number;

    @IsString()
    @IsNotEmpty()
    customerName!: string;

    @IsEmail()
    @IsNotEmpty()
    customerEmail!: string;

    @IsInt()
    @Min(1)
    numSeats!: number;

    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    seatNumbers!: number[];
}
