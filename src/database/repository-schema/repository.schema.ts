import { Schema as NestSchema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GithubApp } from '../githubapp-schema/github-app.schema';
import { User } from '../user-schema/user.schema';

export type RepositoryDocument = Repository & Document;

@NestSchema({ timestamps: true })
export class Repository {
    @Prop({ type: 'ObjectId', ref: 'User', required: true }) // Reference to the User schema
    user: User;

    @Prop()
    gitHubRepoId: number;

    @Prop({ required: true })
    repoName: string;

    @Prop({ required: true })
    repoUrl: string;

    @Prop({ required: true })
    repoDescription: string;

    @Prop({ required: true })
    owner: string;

    @Prop({ required: true })
    ownerType: string;

    @Prop({ required: true }) // GitHub repository URL
    htmlUrl: string;

    @Prop({ required: true })
    isPrivate: boolean;

    @Prop({ required: true, default: 'main' })
    defaultBranch: string;

    @Prop({ type: 'ObjectId', ref: 'GithubApp', required: true })
    githubApp: GithubApp;

    @Prop({ default: false }) // Indicates if the repository is selected (defaults to false)
    isSelected: boolean;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
