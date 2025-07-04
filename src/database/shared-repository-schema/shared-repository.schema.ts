import { Schema as NestSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SharedRepositoryDocument = SharedRepository & Document;

@NestSchema({ timestamps: true })
export class SharedRepository {
    @Prop({
        required: true,
        type: MongooseSchema.Types.ObjectId,
        ref: 'Repository',
    })
    repositoryId: MongooseSchema.Types.ObjectId;

    @Prop({
        required: true,
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
    })
    sharedWith: MongooseSchema.Types.ObjectId;

    @Prop({
        required: true,
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
    })
    sharedBy: MongooseSchema.Types.ObjectId;

    @Prop({ required: true, default: false })
    isDeleted: boolean;
}

export const SharedRepositorySchema =
    SchemaFactory.createForClass(SharedRepository);
