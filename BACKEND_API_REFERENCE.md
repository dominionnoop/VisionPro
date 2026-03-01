# Aatron Backend API Reference

**Base URL:** `http://localhost:8000/api/v1`

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication (AUTH)](#authentication-auth)
3. [Vision Management (VISION)](#vision-management-vision)
4. [Dashboard (DASHBOARD)](#dashboard-dashboard)
5. [Detection Logs](#detection-logs)

---

## Health Check

### GET /health
Check if the backend server is running.

```
GET http://localhost:8000/health
```

**Response (200 OK):**
```json
{
  "status": "ok"
}
```

---

## Authentication (AUTH)

Authentication uses JWT tokens. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### POST /api/v1/auth/register
Register a new user account.

```
POST /api/v1/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "user@example.com",
  "role": "user",
  "is_active": true
}
```

**Errors:**
- `400 Bad Request` - Username or email already registered

---

### POST /api/v1/auth/login
Login with username and password to get JWT tokens.

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized` - Invalid username or password
- `400 Bad Request` - Inactive user

---

### POST /api/v1/auth/logout
Logout and invalidate the current session.

```
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

**Errors:**
- `401 Unauthorized` - Invalid token

---

### POST /api/v1/auth/refresh
Refresh the access token using a refresh token.

```
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

**Response (200 OK):**
```json
{
  "access_token": "new_jwt_token",
  "refresh_token": "jwt_token",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized` - Invalid refresh token or expired session

---

### GET /api/v1/auth/me
Get the current authenticated user's information.

```
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "user@example.com",
  "role": "user",
  "is_active": true
}
```

**Errors:**
- `401 Unauthorized` - Invalid or revoked token
- `404 Not Found` - User not found

---

## Vision Management (VISION)

All vision endpoints require authentication.

### Projects

#### GET /api/v1/vision/projects
Get all projects.

```
GET /api/v1/vision/projects
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "created_at": "ISO8601_timestamp",
    "updated_at": "ISO8601_timestamp",
    "status": "active",
    "cameras": [],
    "models": []
  }
]
```

---

#### GET /api/v1/vision/projects/{project_id}
Get a specific project by ID.

```
GET /api/v1/vision/projects/{project_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "created_at": "ISO8601_timestamp",
  "updated_at": "ISO8601_timestamp",
  "status": "active",
  "cameras": [],
  "models": []
}
```

**Errors:**
- `404 Not Found` - Project not found

---

### Cameras

#### GET /api/v1/vision/cameras
Get all camera configurations.

```
GET /api/v1/vision/cameras
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "cam-xxxxxxxx",
    "name": "string",
    "protocol": "GigE|RTSP|HTTP|USB",
    "connection_string": "string",
    "status": "disconnected|connected|error",
    "mode": "auto|manual",
    "settings": {},
    "created_at": "ISO8601_timestamp"
  }
]
```

---

#### POST /api/v1/vision/cameras
Create a new camera configuration.

```
POST /api/v1/vision/cameras
Authorization: Bearer <access_token>
Content-Type: application/x-www-form-urlencoded
```

**Request Body (Form Data):**
```
name=Camera%20Name
protocol=RTSP
connection_string=rtsp://192.168.1.100:554/stream
mode=auto
```

**Response (201 Created):**
```json
{
  "id": "cam-xxxxxxxx",
  "name": "Camera Name",
  "protocol": "RTSP",
  "connection_string": "rtsp://192.168.1.100:554/stream",
  "status": "disconnected",
  "mode": "auto",
  "created_at": "ISO8601_timestamp"
}
```

**Errors:**
- `400 Bad Request` - Invalid protocol (must be GigE, RTSP, HTTP, or USB)

---

#### PUT /api/v1/vision/cameras/{camera_id}
Update a camera configuration.

```
PUT /api/v1/vision/cameras/{camera_id}
Authorization: Bearer <access_token>
Content-Type: application/x-www-form-urlencoded
```

**Request Body (Form Data - all optional):**
```
name=Updated Name
protocol=RTSP
connection_string=rtsp://new-ip:554/stream
mode=manual
```

**Response (200 OK):**
```json
{
  "id": "cam-xxxxxxxx",
  "name": "Updated Name",
  "protocol": "RTSP",
  "connection_string": "rtsp://new-ip:554/stream",
  "status": "disconnected",
  "mode": "manual",
  "created_at": "ISO8601_timestamp"
}
```

**Errors:**
- `404 Not Found` - Camera not found

---

#### DELETE /api/v1/vision/cameras/{camera_id}
Delete a camera configuration.

```
DELETE /api/v1/vision/cameras/{camera_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Camera deleted successfully"
}
```

**Errors:**
- `404 Not Found` - Camera not found

---

### Models

#### GET /api/v1/vision/models/types
Get all available model types.

```
GET /api/v1/vision/models/types
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "yolov8",
    "name": "YOLOv8",
    "description": "...",
    "supported_formats": ["pt", "onnx"],
    "framework": "ultralytics"
  },
  ...
]
```

---

#### GET /api/v1/vision/models
Get all models, optionally filtered by type.

```
GET /api/v1/vision/models?model_type=yolov8
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `model_type` (optional) - Filter by model type

**Response (200 OK):**
```json
[
  {
    "id": "model-xxxxxxxx",
    "name": "string",
    "filename": "model.pt",
    "file_size": 123456,
    "model_type": "yolov8",
    "file_format": ".pt",
    "framework": "ultralytics",
    "version": "8.0",
    "classes": ["class1", "class2"],
    "confidence": 0.5,
    "roi": {},
    "status": "ready",
    "created_at": "ISO8601_timestamp"
  }
]
```

---

#### POST /api/v1/vision/models/upload
Upload a new model file.

```
POST /api/v1/vision/models/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
file=<binary_file>
name=My Model
model_type=yolov8
description=Optional description
confidence=0.5
```

**Response (200 OK):**
```json
{
  "id": "model-xxxxxxxx",
  "name": "My Model",
  "filename": "model.pt",
  "file_size": 123456,
  "model_type": "yolov8",
  "file_format": ".pt",
  "status": "ready",
  "created_at": "ISO8601_timestamp"
}
```

**Errors:**
- `400 Bad Request` - Invalid file format for the model type

---

#### GET /api/v1/vision/models/{model_id}
Get a specific model by ID.

```
GET /api/v1/vision/models/{model_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "model-xxxxxxxx",
  "name": "string",
  "filename": "model.pt",
  "file_size": 123456,
  "model_type": "yolov8",
  "file_format": ".pt",
  "framework": "ultralytics",
  "version": "8.0",
  "classes": ["class1", "class2"],
  "confidence": 0.5,
  "roi": {},
  "status": "ready",
  "created_at": "ISO8601_timestamp"
}
```

**Errors:**
- `404 Not Found` - Model not found

---

#### GET /api/v1/vision/models/{model_id}/info
Get detailed model information including inference capabilities.

```
GET /api/v1/vision/models/{model_id}/info
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "model-xxxxxxxx",
  "name": "string",
  "model_type": "yolov8",
  "file_format": ".pt",
  "framework": "ultralytics",
  "status": "ready",
  "inference": {
    "input_shape": [640, 640],
    "classes": ["class1", "class2"],
    "confidence_threshold": 0.5,
    ...
  }
}
```

**Errors:**
- `404 Not Found` - Model not found
- `500 Internal Server Error` - Failed to get model info

---

#### POST /api/v1/vision/models/{model_id}/test
Test a model with an uploaded image.

```
POST /api/v1/vision/models/{model_id}/test
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
image=<binary_image_file>
confidence=0.5
iou_threshold=0.45
```

**Response (200 OK):**
```json
{
  "model_id": "model-xxxxxxxx",
  "model_name": "string",
  "model_type": "yolov8",
  "detections": [
    {
      "class": "class_name",
      "confidence": 0.95,
      "bbox": [x1, y1, x2, y2]
    }
  ],
  "inference_time_ms": 45.2,
  "image_size": [640, 480],
  "timestamp": "ISO8601_timestamp"
}
```

**Errors:**
- `404 Not Found` - Model not found or model file not found
- `400 Bad Request` - Invalid file type or confidence value
- `500 Internal Server Error` - Inference failed

---

#### DELETE /api/v1/vision/models/{model_id}
Delete a model and its file.

```
DELETE /api/v1/vision/models/{model_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Model deleted successfully",
  "file_deleted": true
}
```

**Errors:**
- `404 Not Found` - Model not found

---

### Inference Devices

#### GET /api/v1/vision/devices
Get available inference devices (CPU/GPU).

```
GET /api/v1/vision/devices
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "cpu",
    "name": "CPU",
    "type": "cpu"
  },
  {
    "id": "cuda:0",
    "name": "NVIDIA GeForce RTX 3080",
    "type": "gpu"
  }
]
```

---

### Stream Relay

#### POST /api/v1/vision/relay/{stream_id}
Upload a frame from the frontend client.

```
POST /api/v1/vision/relay/{stream_id}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
file=<binary_jpeg_frame>
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "size": 12345
}
```

---

#### GET /api/v1/vision/relay/{stream_id}
Get stream feed as MJPEG.

```
GET /api/v1/vision/relay/{stream_id}
```

**Response (200 OK):**
- MJPEG stream with `Content-Type: multipart/x-mixed-replace; boundary=frame`

---

### Camera Stream Proxy

#### GET /api/v1/vision/proxy/{camera_id}
Proxy a camera stream (MJPEG) from the backend to the client. Useful for accessing local resources from the browser.

```
GET /api/v1/vision/proxy/{camera_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
- MJPEG stream with `Content-Type: multipart/x-mixed-replace; boundary=frame`

**Errors:**
- `404 Not Found` - Camera not found

---

### Media Library

#### GET /api/v1/vision/media
List all test media records.

```
GET /api/v1/vision/media
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "record-xxxxxxxx",
    "type": "image",
    "input_url": "/media/inputs/image.jpg",
    "output_url": "/media/outputs/result.jpg",
    "created_at": "ISO8601_timestamp",
    "model_name": "Model Name"
  }
]
```

---

#### DELETE /api/v1/vision/media/{record_id}
Delete a test media record and its files.

```
DELETE /api/v1/vision/media/{record_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success"
}
```

**Errors:**
- `404 Not Found` - Media record not found

---

### Live Inference Streams

#### GET /api/v1/vision/inference/live/stream/{camera_id}/{model_id}
Stream live inference results as MJPEG.

```
GET /api/v1/vision/inference/live/stream/{camera_id}/{model_id}?confidence=0.5&iou_threshold=0.45&fps=10&device=gpu
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `confidence` (optional, default: 0.5) - Confidence threshold (0-1)
- `iou_threshold` (optional, default: 0.45) - IoU threshold for NMS
- `fps` (optional, default: 10) - Target frames per second
- `device` (optional, default: gpu) - Device to use (gpu or cpu)

**Response (200 OK):**
- MJPEG stream with inference bounding boxes and annotations

**Errors:**
- `404 Not Found` - Camera or model not found

---

#### GET /api/v1/vision/inference/live/stream/{camera_id}/{model_id}/results
Get the latest inference results for a specific stream.

```
GET /api/v1/vision/inference/live/stream/{camera_id}/{model_id}/results
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "active|stopped|inactive",
  "camera_id": "cam-xxxxxxxx",
  "model_id": "model-xxxxxxxx",
  "data": {
    "detections": [
      {
        "class": "class_name",
        "confidence": 0.95,
        "bbox": [x1, y1, x2, y2]
      }
    ],
    "inference_time_ms": 45.2,
    "fps": 25.5,
    "timestamp": "ISO8601_timestamp"
  }
}
```

---

#### POST /api/v1/vision/inference/live/stop/{camera_id}/{model_id}
Stop an active inference stream.

```
POST /api/v1/vision/inference/live/stop/{camera_id}/{model_id}
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Stream cam-xxx_model-xxx stopped"
}
```

**Errors:**
- `400 Bad Request` or error status - Stream not found or already stopped

---

#### POST /api/v1/vision/inference/live/config/{camera_id}/{model_id}
Update stream configuration (class filters, colors).

```
POST /api/v1/vision/inference/live/config/{camera_id}/{model_id}
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "class_name": {
    "visible": true,
    "color": "#FF0000"
  },
  "another_class": {
    "visible": false,
    "color": "#00FF00"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Config updated for cam-xxx_model-xxx",
  "config": {
    "class_name": { "visible": true, "color": "#FF0000" }
  }
}
```

**Errors:**
- Error status - Stream not found or not active

---

#### GET /api/v1/vision/inference/live/detections
Get the latest live inference detection results as JSON.

```
GET /api/v1/vision/inference/live/detections
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "detections": [
    {
      "class": "class_name",
      "confidence": 0.95,
      "bbox": [x1, y1, x2, y2]
    }
  ],
  "camera_id": "cam-xxxxxxxx",
  "model_id": "model-xxxxxxxx",
  "timestamp": "ISO8601_timestamp",
  "status": "ok|waiting",
  "total_detections": 5
}
```

---

## Dashboard (DASHBOARD)

Dashboard endpoints provide real-time statistics and monitoring data.

### GET /api/v1/dashboard/stats
Get dashboard statistics.

```
GET /api/v1/dashboard/stats
```

**Response (200 OK):**
```json
[
  {
    "label": "TOTAL INSPECTIONS",
    "value": "1234",
    "description": "FRAMES PROCESSED",
    "intent": "neutral",
    "icon": "gear",
    "direction": "up"
  },
  {
    "label": "DEFECTS FOUND",
    "value": "45",
    "description": "ISSUES DETECTED",
    "intent": "negative",
    "icon": "boom",
    "direction": "up"
  },
  {
    "label": "ACTIVE STREAMS",
    "value": "3",
    "description": "CAMERAS RUNNING",
    "intent": "positive",
    "icon": "proccesor",
    "tag": "LIVE"
  }
]
```

---

### GET /api/v1/dashboard/charts
Get chart data for analytics.

```
GET /api/v1/dashboard/charts
```

**Response (200 OK):**
```json
{
  "week": [
    { "date": "06/07", "sales": 50000, "spendings": 30000, "coffee": 10000 },
    ...
  ],
  "month": [
    { "date": "Jan", "spendings": 45000, "sales": 180000, "coffee": 25000 },
    ...
  ],
  "year": [
    { "date": "2020", "spendings": 280000, "sales": 580000, "coffee": 150000 },
    ...
  ]
}
```

---

### GET /api/v1/dashboard/ranking
Get user ranking data.

```
GET /api/v1/dashboard/ranking
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "KRIMSON",
    "handle": "@KRIMSON",
    "streak": "2 WEEKS STREAK 🔥",
    "points": 148,
    "avatar": "/avatars/user_krimson.png",
    "featured": true,
    "subtitle": "2 WEEKS STREAK 🔥"
  },
  ...
]
```

---

### GET /api/v1/dashboard/security
Get security status information.

```
GET /api/v1/dashboard/security
```

**Response (200 OK):**
```json
[
  {
    "title": "GUARD BOTS",
    "value": "124/124",
    "status": "[RUNNING...]",
    "variant": "success"
  },
  {
    "title": "FIREWALL",
    "value": "99.9%",
    "status": "[BLOCKED]",
    "variant": "success"
  },
  ...
]
```

---

### GET /api/v1/dashboard/notifications
Get all notifications.

```
GET /api/v1/dashboard/notifications
```

**Response (200 OK):**
```json
[
  {
    "id": "notif-1",
    "title": "PAYMENT RECEIVED",
    "message": "Your payment to Rampant Studio has been processed successfully.",
    "timestamp": "2024-07-10T13:39:00Z",
    "type": "success",
    "read": false,
    "priority": "medium"
  },
  ...
]
```

---

### GET /api/v1/dashboard/widget
Get widget data (location, weather, etc.).

```
GET /api/v1/dashboard/widget
```

**Response (200 OK):**
```json
{
  "location": "Buenos Aires, Argentina",
  "timezone": "UTC-3",
  "temperature": "18°C",
  "weather": "Partly Cloudy",
  "date": "Wednesday, July 10th, 2025"
}
```

---

## Detection Logs

Detection logs endpoints are available at the base URL without a specific prefix.

### GET /api/v1/detection-logs
Get detection logs with filtering and pagination.

```
GET /api/v1/detection-logs?skip=0&limit=50&camera_id=cam-xxx&has_detections=true
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `skip` (optional, default: 0) - Number of records to skip
- `limit` (optional, default: 50) - Maximum number of records to return
- `camera_id` (optional) - Filter by camera ID
- `model_id` (optional) - Filter by model ID
- `has_detections` (optional) - Filter by detection presence (true/false)
- `start_date` (optional) - Filter by start date (ISO8601)
- `end_date` (optional) - Filter by end date (ISO8601)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "log-xxxxxxxx",
      "camera_id": "cam-xxxxxxxx",
      "model_id": "model-xxxxxxxx",
      "timestamp": "ISO8601_timestamp",
      "has_detections": true,
      "detections": [
        { "class": "class_name", "confidence": 0.95, "bbox": [x1, y1, x2, y2] }
      ]
    }
  ],
  "skip": 0,
  "limit": 50
}
```

---

### GET /api/v1/detection-logs/stats
Get aggregated detection statistics.

```
GET /api/v1/detection-logs/stats?days=7
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `days` (optional, default: 7) - Number of days to analyze

**Response (200 OK):**
```json
{
  "period_days": 7,
  "total_inspections": 1250,
  "total_defects": 45,
  "defect_rate": 3.6,
  "by_camera": {
    "cam-xxx": 500,
    "cam-yyy": 750
  }
}
```

---

### DELETE /api/v1/detection-logs
Clear detection logs.

```
DELETE /api/v1/detection-logs?older_than_days=30
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `older_than_days` (optional) - If provided, only delete logs older than N days. Otherwise, delete ALL logs.

**Response (200 OK):**
```json
{
  "deleted_count": 125
}
```

---

## Error Responses

All API endpoints use standard HTTP status codes and return error details in JSON format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication Flow

1. **Register** → POST `/api/v1/auth/register` → User account created
2. **Login** → POST `/api/v1/auth/login` → Get `access_token` and `refresh_token`
3. **Use Token** → Include in header: `Authorization: Bearer <access_token>`
4. **Refresh** → POST `/api/v1/auth/refresh` with `refresh_token` → Get new `access_token`
5. **Logout** → POST `/api/v1/auth/logout` → Invalidate session

---

## Example Usage

### JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user',
    password: 'password'
  })
});

const { access_token } = await loginResponse.json();

// Get cameras
const camerasResponse = await fetch('http://localhost:8000/api/v1/vision/cameras', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});

const cameras = await camerasResponse.json();
```

### Python (requests)

```python
import requests

# Login
response = requests.post('http://localhost:8000/api/v1/auth/login', json={
    'username': 'user',
    'password': 'password'
})

access_token = response.json()['access_token']

# Get cameras
response = requests.get('http://localhost:8000/api/v1/vision/cameras', 
    headers={'Authorization': f'Bearer {access_token}'})

cameras = response.json()
```

---

**Last Updated:** February 28, 2026
**API Version:** v1
