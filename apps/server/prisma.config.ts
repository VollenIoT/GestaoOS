import { defineConfig } from '@prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: {
    kind: 'single',
    filePath: './schema.prisma',
  },
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
});
