import { Module } from '@nestjs/common';
import { DependenciesService } from './dependencies.service';
import { DependenciesController } from './dependencies.controller';
import { DependencySchemaModule } from 'src/database/dependency-schema/dependency-schema.module';
import { BullModule } from '@nestjs/bullmq';
import { DependencyConsumer } from './dependencies.consumer';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    DependencySchemaModule,
    BullModule.registerQueue({
      name: 'dependency',
    }),
  ],
  controllers: [DependenciesController],
  providers: [DependenciesService, DependencyConsumer],
})
export class DependenciesModule {}
