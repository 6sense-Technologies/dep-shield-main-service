import { IsNotEmpty } from 'class-validator';

export class GetSharedRepoDto {
    @IsNotEmpty()
    page: string;

    @IsNotEmpty()
    limit: string;
}
