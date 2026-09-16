FROM node:20-slim AS base
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/package.json
COPY packages/db/prisma/schema.prisma packages/db/prisma/schema.prisma
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspaces --include-workspace-root

COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace=@sop/db
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm run build --workspace=@sop/shared
RUN npm run build --workspace=apps/api

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
