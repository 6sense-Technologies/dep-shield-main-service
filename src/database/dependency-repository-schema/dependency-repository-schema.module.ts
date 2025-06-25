import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DependencyRepository,
  DependencyRepositorySchema,
} from './dependency-repository.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DependencyRepository.name, schema: DependencyRepositorySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DependencyRepositorySchemaModule {}
