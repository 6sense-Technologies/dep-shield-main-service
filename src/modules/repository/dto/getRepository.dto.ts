import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class GetRepositoryDto {
    @IsNotEmpty()
    limit?: string;
    @IsNotEmpty()
    page?: string;
    @IsOptional()
    @IsMongoId()
    dependencyId?: string;
    @IsOptional()
    license?: string;
    @IsOptional()
    vulnerabilityId?: string;
}
