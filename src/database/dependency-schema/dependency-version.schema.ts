import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';

export type DependencyVersionDocument = DependencyVersion & Document;

@NestSchema({ timestamps: true })
export class DependencyVersion {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: 'Dependency',
  })
  dependencyId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  versionId: string;

  @Prop({ required: true })
  publishDate: Date;
}

export const DependencyVersionSchema =
  SchemaFactory.createForClass(DependencyVersion);
