import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';

export type DependencyRepositoryDocument = DependencyRepository & Document;

@NestSchema({ timestamps: true })
export class DependencyRepository {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Dependency',
  })
  dependencyId: MongooseSchema.Types.ObjectId;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Repository',
  })
  repositoryId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  installedVersion: string;

  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Dependency',
    default: null,
  })
  parent: MongooseSchema.Types.ObjectId;
}

export const DependencyRepositorySchema =
  SchemaFactory.createForClass(DependencyRepository);
