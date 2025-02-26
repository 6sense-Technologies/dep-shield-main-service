import { IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectRepoUrlDto {
  @ApiProperty({
    description: 'Array of selected repository URLs by their MongoDB ObjectId',
    type: [String], // Indicates an array of strings (ObjectIds)
    example: ['65b2a4e8a4b2d5c123456789', '65b2a4e8a4b2d5c987654321'],
  })
  @IsArray()
  @IsMongoId({ each: true }) // Validate each ID in the array
  selectedUrls: string[]; // Array of selected URL IDs
}
