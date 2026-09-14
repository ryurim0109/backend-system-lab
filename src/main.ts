import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';

async function bootstrap() {
  const appOptions ={cors: true, bodyParser: true, rawBody: true, forceCloseConnections: true};
  const app = await NestFactory.create(AppModule, appOptions);
 
  app.setGlobalPrefix('api');
  
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Backend System Lab')
    .setDescription('Backend System Lab API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  await app.listen(3000);
}
bootstrap();
