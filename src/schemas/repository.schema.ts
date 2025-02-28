import { Document } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';
import { User } from './user.schema'; // Import the User schema

export type RepositoryDocument = Repository & Document;

@NestSchema({ timestamps: true })
export class Repository {
  @Prop({ type: 'ObjectId', ref: 'User', required: true }) // Reference to the User schema
  user: User;

  @Prop({ required: true, unique: true }) // GitHub repository URL (must be unique)
  repoUrl: string;

  @Prop({ default: false }) // Indicates if the repository is selected (defaults to false)
  isSelected: boolean;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
