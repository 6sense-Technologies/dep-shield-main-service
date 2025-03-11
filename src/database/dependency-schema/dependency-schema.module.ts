import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Dependency, DependencySchema } from './dependency.schema';
import {
  DependencyVersion,
  DependencyVersionSchema,
} from './dependency-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dependency.name, schema: DependencySchema },
      { name: DependencyVersion.name, schema: DependencyVersionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DependencySchemaModule {}
