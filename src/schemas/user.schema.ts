import { Document } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';

export type UserDocument = User & Document;

@NestSchema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: 'credential' })
  loginType: string;

  @Prop({ required: false, default: 'N/A' })
  githubAccessToken: string;

  @Prop({ required: false, default: 'N/A' })
  githubInstallationAccessToken: string;

  @Prop({ required: false, default: false })
  isVerified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
