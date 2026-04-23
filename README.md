# SpotDrop

A community map application for urban athletes to discover, share, and discuss sports spots. Users can browse an interactive map to find climbing walls, skate spots, ski areas, parkour locations, and more - or contribute their own finds with photos, difficulty ratings, and descriptions. Each spot has its own forum thread for community discussion.

---

## Contributors

| Name | GitHub |
|------|--------|
| Brock Benton | [@brockbenton](https://github.com/brockbenton) |
| Sam Kasten | [@killthecreep](https://github.com/killthecreep) |
| Atharva | - |
| Alex | - |
| Akhil | [@Akhil986](https://github.com/Akhil986) |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (LTS) |
| Framework | Express.js |
| Templating | Handlebars (express-handlebars) |
| Database | PostgreSQL 14 |
| Maps | Leaflet 1.9.4 + OpenStreetMap |
| Auth | bcryptjs + express-session |
| Media Upload | Multer + Cloudinary |
| CSS | Bootstrap 5.3.0 |
| Testing | Mocha + Chai |
| Containerization | Docker + Docker Compose |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) - recommended path
- **Or**, for manual setup: [Node.js LTS](https://nodejs.org/) and [PostgreSQL 14](https://www.postgresql.org/)
- A [Cloudinary](https://cloudinary.com/) account is only required if you want media uploads to work in your local environment (the deployed app has this configured already)

---

## Running Locally

### Option A — Docker Compose (recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/brockbenton/csci3308-project.git
   cd csci3308-project/ProjectSourceCode
   ```

2. Create a `.env` file in `ProjectSourceCode/` with the following variables:
   ```env
   POSTGRES_DB=spotdrop
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_db_password
   SESSION_SECRET=your_session_secret

   # Optional — required only if you want media uploads to work
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. Start the application:
   ```bash
   docker-compose up
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The database will be seeded automatically with sample spots in the Denver area.

---

### Option B — Manual Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file as shown above, and additionally set:
   ```env
   PGHOST=localhost
   PGPORT=5432
   ```

3. Initialize the database (apply `src/init_data/create.sql` and `src/init_data/insert.sql` to your PostgreSQL instance).

4. Start the server:
   ```bash
   npm start
   ```

---

## Running Tests

```bash
npm test
```

Tests use Mocha + Chai and cover the core API endpoints:

- `GET /api/spots` — returns all spots
- `GET /api/spots?sport_type=...` — filters spots by sport type
- `POST /api/spots` — requires authentication (401 without session)
- Spot creation with valid session
- Error handling for missing required fields

To run tests and then start the server in one command:

```bash
npm run testandrun
```

---

## Deployed Application

[https://csci3308-project-x51h.onrender.com/](https://csci3308-project-x51h.onrender.com/)
