import { Schema as NestSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

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

    @Prop({ default: null })
    installedVersion: string;

    @Prop({ default: null })
    requiredVersion: string;

    @Prop({ default: null })
    dependencyType: string;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'Dependency',
        default: null,
    })
    parent: MongooseSchema.Types.ObjectId;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const DependencyRepositorySchema =
    SchemaFactory.createForClass(DependencyRepository);
