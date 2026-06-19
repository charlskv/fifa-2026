# FIFA World Cup 2026 Watch Finder (PWA)

A local-first Progressive Web App to track remaining FIFA World Cup 2026 fixtures and where to watch in Germany.

## What this app does

- Loads official FIFA fixtures for competition `17` and season `285023`.
- Loads official FIFA Germany watch sources from FIFA watch API.
- Displays separate columns for:
  - Telekom
  - ARD
  - ZDF
- Leaves channel cells blank when FIFA has not published a link yet.
- Provides a manual **Refresh From FIFA** button.
- Supports filtering by team, channel, and date range.
- Works as an installable PWA with cached match list data.

## Data sources (official FIFA)

Backend uses:

- `https://api.fifa.com/api/v3/calendar/matches?language=en&idCompetition=17&idSeason=285023&count=400`
- `https://api.fifa.com/api/v3/watch/season/285023/DE?language=en`

Frontend links each match to:

- `https://www.fifa.com/en/match-centre/match/{competitionId}/{seasonId}/{stageId}/{matchId}`

## Project structure

- `frontend/` React + Vite + TypeScript + PWA
- `backend/` Express + TypeScript API

## Local run

Open two terminals.

### 1) Backend

```powershell
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:3001`.

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Build

### Backend

```powershell
cd backend
npm run build
npm start
```

### Frontend

```powershell
cd frontend
npm run build
npm run preview
```

## Deploy to Azure

See [DEPLOY.md](DEPLOY.md) for comprehensive step-by-step deployment guide.

**Quick Summary:**
1. Create Azure resource group, Container Registry, and Static Web App
2. Configure GitHub Secrets for CI/CD
3. Push to `main` branch
4. GitHub Actions automatically builds and deploys
5. Share the Static Web App URL with users

**Cost estimate:** ~$10-20/month

**Alternative:** For manual deployment without GitHub Actions, run:
```powershell
./deploy-azure.ps1 -ResourceGroup fifa-rg -Location eastus -AcrName fifaregistry
```

## API contract

### `GET /api/matches`

Returns cached response:

- `lastUpdated`
- `source`
- `total`
- `matches[]`

### `POST /api/refresh`

Forces refresh from official FIFA APIs and returns updated response.

## Notes

- The app does not assume ARD/ZDF availability.
- If FIFA watch links are not published yet for a future match, the cell remains blank.
- The refresh endpoint is idempotent and safe to call repeatedly.

