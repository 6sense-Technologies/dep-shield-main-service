import { Document } from 'mongoose';
import { Prop, SchemaFactory, Schema as NestSchema } from '@nestjs/mongoose';

export type DependencyDocument = Dependency & Document;

@NestSchema({ timestamps: true })
export class Dependency {
  @Prop({ required: true })
  dependencyName: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  license?: string;

  @Prop({ required: false })
  homepage?: string;

  @Prop({ required: false })
  repository?: string;

  @Prop({ required: false })
  npm?: string;

  @Prop({ required: false, type: [{ name: String, email: String }] })
  maintainers?: { name: string; email: string }[];

  @Prop({ required: false })
  currentVersion?: string;

  @Prop({ required: false })
  lastPublishDate?: Date;

  @Prop({ required: false, type: Object })
  evaluation?: {
    quality: {
      carefulness: number;
      tests: number;
      health: number;
      branding: number;
    };
    popularity: {
      communityInterest: number;
      downloadsCount: number;
      downloadsAcceleration: number;
      dependentsCount: number;
    };
    maintenance: {
      releasesFrequency: number;
      commitsFrequency: number;
      openIssues: number;
      issuesDistribution: number;
    };
  };

  @Prop({ required: false, type: Object })
  score?: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };

  @Prop({ required: false, default: false })
  isDeleted: boolean;
}

export const DependencySchema = SchemaFactory.createForClass(Dependency);
