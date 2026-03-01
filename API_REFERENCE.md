# Aatron API Reference (Backup)

This document contains the backend API endpoints as of February 2026, intended as a reference for frontend development.

## Base URL: `/api`

### Auth (`/auth`)
- **POST** `/auth/register`: User registration.
- **POST** `/auth/login`: Get tokens.
- **POST** `/auth/logout`: Revoke session.
- **POST** `/auth/refresh`: New access token.
- **GET** `/auth/me`: User profile.

### Vision (`/vision`)
- **GET** `/vision/projects`: List projects.
- **GET** `/vision/cameras`: List cameras.
- **POST** `/vision/cameras`: Add camera.
- **GET** `/vision/models`: List models.
- **POST** `/vision/models/upload`: Upload model.
- **GET** `/vision/devices`: Hardware info.

### Inference (`/vision/inference`)
- **GET** `/vision/inference/live/stream/{cam}/{mod}`: MJPEG feed.
- **GET** `/vision/inference/live/stream/{cam}/{mod}/results`: JSON data.
- **POST** `/vision/inference/live/stop/{cam}/{mod}`: Stop stream.
- **GET** `/vision/inference/live/detections`: Global hits.

### Dashboard (`/dashboard`)
- **GET** `/dashboard/stats`: Global stats.
- **GET** `/dashboard/charts`: Trend data.
- **GET** `/dashboard/ranking`: Ranking.
- **GET** `/dashboard/notifications`: Alerts.
