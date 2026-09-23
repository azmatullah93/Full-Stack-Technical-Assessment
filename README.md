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
npx playwright install chromium
npm run test:e2e
npm run build
npm run start -w apps/api
npm run start -w apps/web
```
