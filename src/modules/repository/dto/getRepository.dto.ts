import { IsNotEmpty, IsOptional } from 'class-validator';

export class GetRepositoryDto {
    @IsNotEmpty()
    limit?: string;
    @IsNotEmpty()
    page?: string;
    @IsOptional()
    dependencyId?: string;
}
