
  # UNISCOUT College Recommendation System

A college-based recommendation system for engineering admissions in Maharashtra based on MHT CET marks and percentile.

## Features

- **MHT CET Portal**: Get personalized engineering college recommendations based on your MHT CET percentile
- **Smart Filtering**: Filter by category, branch preference, location, and CAP round
- **Admission Chance Calculator**: See your admission chances (High/Medium/Low) for each college
- **Mobile Responsive**: Fully responsive design for all devices
- **Real-time Data**: Based on official CAP round cutoff data

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Framer Motion for animations
- Radix UI for accessible components

### Backend
- Node.js with Express
- TypeScript
- xlsx for Excel file parsing
- Winston for logging
- Express Rate Limit for API protection

## Project Structure

```
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── services/           # API services
│   └── styles/             # CSS styles
├── backend/                # Backend source code
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   └── package.json
├── MHTCET_CAP_DATA.xlsx    # College cutoff data
└── package.json            # Frontend dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "UNISCOUT College Recommendation System 3"
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Running the Application

#### Development Mode

1. **Start the Backend Server** (Terminal 1)
   ```bash
   cd backend
   npm run dev
   ```
   The backend will start on http://localhost:5000

2. **Start the Frontend** (Terminal 2)
   ```bash
   npm run dev
   ```
   The frontend will start on http://localhost:3000

#### Production Build

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Build Backend**
   ```bash
   cd backend
   npm run build
   npm start
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/filters` | Get available filter options |
| GET | `/api/branches` | Get all branches |
| GET | `/api/locations` | Get all locations |
| GET | `/api/categories` | Get all categories |
| POST | `/api/recommendations` | Get college recommendations |

### Recommendation Request Body

```json
{
  "percentile": 95.5,
  "year": "2024",
  "capRound": "I",
  "category": "Open",
  "branchPreference": "Computer Engineering",
  "location": "Pune"
}
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

### Backend (backend/.env)
```
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATA_FILE_PATH=../MHTCET_CAP_DATA.xlsx
```

## Data Format

The application expects an Excel file (`MHTCET_CAP_DATA.xlsx`) with the following columns:
- College Code/Institute Code
- College Name/Institute Name
- Branch Code
- Branch Name/Course Name
- Category/Seat Type
- Cutoff Percentile
- Year
- CAP Round
- Location/District
- Fees (optional)
- Intake/Seats (optional)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Data sourced from official Maharashtra CAP portal
- Original design from Figma: [UNISCOUT College Recommendation System](https://www.figma.com/design/tTEqB1k1cZPA0MJNZ1Uvuk/UNISCOUT-College-Recommendation-System)
  