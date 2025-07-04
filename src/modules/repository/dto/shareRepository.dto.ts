import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ShareRepoDto {
    @IsNotEmpty()
    @IsMongoId()
    repoId: string;

    @IsNotEmpty()
    @IsMongoId()
    sharedWith: string;
}
