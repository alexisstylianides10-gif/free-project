import { defineConfig } from "prisma/config";

// Used only by the Prisma CLI to generate SQL migrations (npm run db:migrations).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: "file:./prisma/dev.db" },
});
