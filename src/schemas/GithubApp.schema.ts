import { Document } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';
import { User } from './user.schema'; // Import the User schema

export type GithubAppDocument = GithubApp & Document;

@NestSchema({ timestamps: true })
export class GithubApp extends Document {
  @Prop({ type: 'ObjectId', ref: 'User', required: true }) // Reference to the User schema
  user: User;

  @Prop({ required: true, unique: true }) // installation access token
  appInstallationAccessToken: string;

  @Prop({ required: true, unique: true }) // installation id
  installationId: string;

  @Prop({ required: false, default: false })
  isDeleted: false;
}

export const GithubAppSchema = SchemaFactory.createForClass(GithubApp);
