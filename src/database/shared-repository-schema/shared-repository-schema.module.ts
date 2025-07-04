import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    SharedRepository,
    SharedRepositorySchema,
} from './shared-repository.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SharedRepository.name, schema: SharedRepositorySchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class SharedRepositorySchemaModule {}
