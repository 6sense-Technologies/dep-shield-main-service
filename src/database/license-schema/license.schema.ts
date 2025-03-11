import { Document } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';

export type DependencyDocument = License & Document;

@NestSchema({ timestamps: true })
export class License {
  @Prop({ required: true })
  licenseId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  reference?: string;

  @Prop({ required: false })
  detailsUrl?: string;

  @Prop({ required: false })
  isDeprecatedLicenseId?: boolean;

  @Prop({ required: false })
  referenceNumber?: number;

  @Prop({ required: false, type: [String] })
  references?: string[];

  @Prop({ required: false })
  isOsiApproved?: boolean;

  @Prop({ required: false })
  licenseText?: string;

  @Prop({ required: false })
  standardLicenseTemplate?: string;

  @Prop({ required: false })
  licenseTextHtml?: string;

  @Prop({ required: false, type: Object })
  useCase?: {
    category?: string;
    licenseFamily?: string;
    licenseRisk?: string;
  };

  @Prop({ required: false })
  summary?: string;
}

export const LicenseSchema = SchemaFactory.createForClass(License);
