import { IsString, IsDateString, IsInt, Min, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateShowDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description!: string;

    @IsDateString()
    @IsNotEmpty()
    startTime!: string;

    @IsDateString()
    @IsNotEmpty()
    endTime!: string;

    @IsInt()
    @Min(1)
    totalSeats!: number;

    @IsNumber()
    @Min(0)
    price!: number;
}
