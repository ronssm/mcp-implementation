import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as helmet from "helmet";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Enable security headers
    app.use(helmet());

    // Configure CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    });

    // Rate limiting could be added here

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    console.error("Error starting the application:", error);
    process.exit(1);
  }
}

void bootstrap();
