# ZJAH Solapur Backend

Production-ready Node.js/Express/MongoDB backend for managing Programs, Masjids, Scholars, Library, Announcements, and Admins.

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/zjah
JWT_SECRET=replace-with-strong-secret
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

## Project Structure

- `index.js` - startup only (connect DB + start server)
- `app.js` - Express app configuration and API routes
- `models/` - Mongoose schemas

## Run Locally

```bash
npm start
```

## API Base Paths

- Preferred: `/api/v1/*`
- Backward-compatible aliases are kept for existing unversioned paths.

Examples:
- `POST /api/v1/login`
- `GET /api/v1/programs`
- `POST /api/v1/announcements`

## Security & Production Improvements

- Helmet enabled
- Rate limiting on login
- Configurable CORS allowlist
- Environment validation at startup
- MongoDB injection sanitization
- Password-safe admin responses (no password leakage)
- Ownership checks for `PROGRAM_ADMIN`, `MASJID_ADMIN`, and `SCHOLAR`
- Centralized safe error formatting for operational errors
- Pino + pino-http logging

## Deployment Notes

- Use a managed MongoDB deployment (Atlas/self-hosted cluster)
- Set strong `JWT_SECRET` and restrictive `CORS_ORIGIN`
- Run behind HTTPS and a reverse proxy
- Store uploaded files in cloud storage/CDN (Cloudinary/S3) for production
