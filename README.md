# Aatron Vision - AI-Powered Computer Vision Platform

**Aatron Vision** is a comprehensive computer vision platform for industrial quality control and inspection. Built with FastAPI, Next.js, and PostgreSQL, it provides real-time object detection, model management, and camera integration.

---

## 🎯 Features

### Core Capabilities
- **🎥 Multi-Camera Support** - GigE, RTSP, HTTP protocols
- **🤖 AI Model Management** - Upload, organize, and deploy YOLOv5/v7/v8/v9 models
- **📊 Real-Time Inference** - Live object detection and classification
- **📁 Organized Storage** - Folder-based model organization by type
- **🔐 Authentication** - JWT-based secure access
- **📈 Dashboard** - Real-time metrics and analytics

### Model Management
- Upload models with drag & drop
- Support for multiple formats: `.pt`, `.onnx`, `.tflite`, `.engine`
- Automatic folder organization: `models/yolov8/`, `models/yolov5/`, etc.
- Type filtering and categorization
- Delete with confirmation
- Progress tracking during upload

---

## 🏗️ Architecture

```
Aatron/
├── client/              # Next.js frontend
│   ├── app/            # Next.js 13+ app directory
│   ├── components/     # React components
│   ├── lib/           # Utilities and API client
│   └── types/         # TypeScript definitions
│
├── server/             # FastAPI backend
│   ├── app/
│   │   ├── api/       # API endpoints
│   │   ├── core/      # Configuration
│   │   ├── db/        # Database models & migrations
│   │   └── services/  # Business logic
│   └── models/        # Uploaded AI models
│
└── local.yml          # Docker Compose configuration
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone & Setup

```bash
git clone <repository-url>
cd Aatron
```

### 2. Configure Environment

**Backend** (`server/.env`):
```env
DATABASE_URL=postgresql+asyncpg://aatron:aatron_dev@postgres:5432/aatron_vision
CORS_ORIGINS=["http://localhost:3000","http://localhost:3002"]
SECRET_KEY=your-secret-key-here
```

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Start Services

```bash
# Build and start all services
docker-compose -f local.yml up -d

# Check status
docker-compose -f local.yml ps
```

### 4. Run Database Migrations

```bash
docker-compose -f local.yml exec backend alembic upgrade head
```

### 5. Access Application

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🚀 GPU Support (Optional)

For faster YOLOv8 inference with NVIDIA GPU:

### Prerequisites
- NVIDIA GPU with CUDA support
- NVIDIA drivers installed
- NVIDIA Container Toolkit

### Start with GPU
```bash
# Use GPU-enabled compose file
docker-compose -f local-gpu.yml up -d

# Verify GPU access
docker exec aatron_backend nvidia-smi
```

### Performance Comparison
- **CPU**: ~100-150ms per image (YOLOv8n)
- **GPU**: ~5-10ms per image (YOLOv8n)

📖 **Full GPU setup guide**: See [GPU_SETUP.md](GPU_SETUP.md)

---

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3002 | Next.js web application |
| Backend | 8000 | FastAPI REST API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & sessions |

---

## 🔧 Development

### Backend Development

```bash
cd server

# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --reload --port 8000

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Frontend Development

```bash
cd client

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## 📚 API Documentation

### Authentication
```bash
POST /api/auth/login
POST /api/auth/register
```

### Projects
```bash
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}
```

### Cameras
```bash
GET    /api/cameras
POST   /api/cameras
GET    /api/cameras/{id}
PUT    /api/cameras/{id}
DELETE /api/cameras/{id}
```

### Models
```bash
GET    /api/models              # List all models
GET    /api/models?model_type=yolov8  # Filter by type
POST   /api/models/upload       # Upload new model
GET    /api/models/{id}         # Get model details
DELETE /api/models/{id}         # Delete model
GET    /api/models/types        # Get available types
```

---

## 🎨 Model Upload Example

### Using the UI
1. Navigate to **Models** page
2. Click **Upload Model**
3. Select model type (YOLOv8, YOLOv5, etc.)
4. Drag & drop your model file
5. Fill in name and description
6. Click **Upload Model**

### Using API
```bash
curl -X POST http://localhost:8000/api/models/upload \
  -F "file=@yolov8n.pt" \
  -F "name=YOLOv8 Nano" \
  -F "model_type=yolov8" \
  -F "description=Lightweight detection model"
```

---

## 🗄️ Database Schema

### Models Table
```sql
CREATE TABLE models (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    description TEXT,
    model_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    framework VARCHAR(50),
    version VARCHAR(50),
    classes JSON,
    confidence FLOAT,
    roi JSON,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose -f local.yml logs backend

# Restart backend
docker-compose -f local.yml restart backend
```

### Database migration issues
```bash
# Check current version
docker-compose -f local.yml exec backend alembic current

# View migration history
docker-compose -f local.yml exec backend alembic history

# Downgrade if needed
docker-compose -f local.yml exec backend alembic downgrade -1
```

### Frontend build errors
```bash
# Clear cache and rebuild
cd client
rm -rf .next node_modules
npm install
npm run build
```

### Missing dependencies
```bash
# Backend
docker-compose -f local.yml build backend

# Frontend
docker-compose -f local.yml build frontend
```

---

## 📋 Common Commands

### Docker Operations
```bash
# Start all services
make up

# Stop all services
make down

# View logs
make logs

# Rebuild services
make build

# Restart a service
docker-compose -f local.yml restart <service-name>
```

### Database Operations
```bash
# Connect to PostgreSQL
docker-compose -f local.yml exec postgres psql -U aatron -d aatron_vision

# Backup database
docker-compose -f local.yml exec postgres pg_dump -U aatron aatron_vision > backup.sql

# Restore database
docker-compose -f local.yml exec -T postgres psql -U aatron aatron_vision < backup.sql
```

---

## 🔐 Security Notes

- Change default passwords in production
- Use environment variables for secrets
- Enable HTTPS in production
- Implement rate limiting
- Regular security updates

---

## 📝 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migrations
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **aiofiles** - Async file operations
- **Pydantic** - Data validation

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Shadcn/UI** - Component library
- **Radix UI** - Headless components
- **Tailwind CSS** - Styling
- **Zustand** - State management

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

---

## 📄 License

[Your License Here]

---

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check documentation in `/docs`
- Review walkthrough guides in brain artifacts

---

## 🎯 Roadmap

- [ ] Batch model upload
- [ ] Model versioning
- [ ] Live stream inference
- [ ] Training pipeline integration
- [ ] Model performance metrics
- [ ] Export/import configurations
- [ ] Multi-user collaboration
- [ ] Cloud deployment guides

---

**Built with ❤️ for industrial computer vision**
"# VisionPro" 
