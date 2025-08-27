# Laluanku Server

Quick start:

1. Copy env and configure MySQL

```
cp .env.example .env
```

Set DB credentials in `.env`.

2. Install deps and run

```
npm install
npm run dev
```

Server runs at http://localhost:4000

APIs:

- POST /api/reports (multipart form: images[], notes, startLat, startLng, mediaMeta)
- GET /api/reports/:id

Static:

- /uploads/*  (uploaded files and thumbnails)
- public index at / (client/public)
