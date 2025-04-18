import { IsArray, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDependencyDTO {
  @ApiProperty({
    description: 'Name of the dependency',
    type: String,
    example: 'express',
  })
  dependencyName: string; // Name of the dependency
}
