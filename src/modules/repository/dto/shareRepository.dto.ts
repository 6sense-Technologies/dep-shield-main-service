import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';

export class ShareRepoDto {
    @IsNotEmpty()
    @IsMongoId()
    repoId: string;

    @IsNotEmpty()
    @IsEmail()
    sharedWith: string;
}
