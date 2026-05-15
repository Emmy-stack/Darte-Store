import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
<<<<<<< HEAD
    url: env("DATABASE_URL"),
=======
    url: process.env.DATABASE_URL,
>>>>>>> 9e05213 (Update project)
  },
});