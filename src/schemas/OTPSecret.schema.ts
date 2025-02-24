import { Prop, Schema as NestSchema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type OTPSecretDocument = OTPSecret & Document;

@NestSchema({ timestamps: true })
export class OTPSecret extends Document {
  @Prop({ required: true, unique: true })
  emailAddress: string;

  @Prop({ required: true })
  secret: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OTPSecretSchema = SchemaFactory.createForClass(OTPSecret);
