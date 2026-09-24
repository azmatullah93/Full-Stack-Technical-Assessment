```sh
npm ci
docker compose up -d --wait
npm run seed
npm run dev
```

```sh
# http://localhost:3000
# Frontend and API, in separate terminals:
npm run dev -w apps/web
npm run dev -w apps/api
```

```sh
npm run typecheck
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
# With the seeded application running:
npm run test:live
npm run build
npm run start -w apps/api
npm run start -w apps/web
```
