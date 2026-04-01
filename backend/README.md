# UNISCOUT Backend API

Production-ready backend API for the UNISCOUT College Recommendation System.

## Features

- **College Recommendations**: Get personalized college recommendations based on MHT CET percentile
- **Filter Options**: Dynamic filter options from actual data
- **Rate Limiting**: API protection against abuse
- **Logging**: Comprehensive logging with Winston
- **Validation**: Request validation with express-validator
- **Security**: Helmet and CORS protection

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server health status and data statistics.

### Get Filter Options
```
GET /api/filters
```
Returns available years, CAP rounds, categories, branches, and locations.

### Get Branches
```
GET /api/branches
```
Returns list of all available branches.

### Get Locations
```
GET /api/locations
```
Returns list of all available locations.

### Get Categories
```
GET /api/categories
```
Returns list of all available categories.

### Get Recommendations
```
POST /api/recommendations
Content-Type: application/json

{
  "percentile": 85.5,
  "year": "2024",
  "capRound": "I",
  "category": "Open",
  "branchPreference": "Computer Engineering",
  "location": "Pune"
}
```

Returns college recommendations sorted by admission chance.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "totalResults": 24,
    "query": {...},
    "timestamp": "2024-01-25T..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [...]
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration
│   │   └── index.ts     # Environment config
│   ├── controllers/     # Route controllers
│   │   └── recommendationController.ts
│   ├── middleware/      # Express middleware
│   │   └── validation.ts
│   ├── routes/          # API routes
│   │   └── index.ts
│   ├── services/        # Business logic
│   │   ├── dataService.ts       # Excel data parsing
│   │   └── recommendationService.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── utils/           # Utilities
│   │   └── logger.ts
│   └── server.ts        # Express app entry
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment |
| CORS_ORIGIN | http://localhost:3000 | Allowed CORS origin |
| DATA_FILE_PATH | MHTCET_CAP_DATA.xlsx | Path to Excel data file |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window (15 min) |
| RATE_LIMIT_MAX_REQUESTS | 100 | Max requests per window |

## Recommendation Algorithm

1. **Data Loading**: Excel file is parsed and normalized on server start
2. **Filtering**: Colleges are filtered by year, CAP round, category, branch, and location
3. **Matching**: Branch names are matched using aliases and partial matching
4. **Scoring**: Admission chance is calculated based on percentile difference:
   - High: User percentile >= cutoff + 3
   - Medium: User percentile >= cutoff
   - Low: User percentile < cutoff but within -5
5. **Sorting**: Results sorted by admission chance, then by cutoff percentile

## Technologies

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Excel Parsing**: xlsx (SheetJS)
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: express-validator
