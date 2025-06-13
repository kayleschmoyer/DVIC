# Digital Vehicle Inspection System

## 🚀 Overview

The most advanced digital vehicle inspection system ever created. A mobile-first Progressive Web App with stunning UI/UX, real-time collaboration, and enterprise-grade architecture.

## ✨ Features

- **Mobile-First Design**: Optimized for touch devices with native app feel
- **Offline Capability**: Full functionality without internet connection
- **Real-Time Updates**: Live collaboration between mechanics
- **AI-Powered**: Smart damage detection and predictive maintenance
- **Voice & Camera**: Voice notes and photo annotations
- **Digital Signatures**: Secure customer approval workflow
- **Beautiful UI**: Glass morphism design with smooth animations

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, PWA
- **Backend**: Node.js, Express, TypeScript, Socket.io
- **Database**: SQL Server (Local/Azure)
- **Authentication**: JWT with refresh tokens
- **Storage**: Local file system with cloud sync

## 📱 Installation

### Prerequisites

- Node.js 18+
- SQL Server (Local or Azure)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd digital-vehicle-inspection
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy .env.example to .env in backend folder
   cp backend/.env.example backend/.env
   # Edit with your database credentials
   ```

4. **Run database migration**
   ```bash
   cd backend
   npm run migrate
   npm run seed  # Optional: Add sample data
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Install as PWA on mobile for best experience

## 🔐 Default Credentials

After running the seed script:
- **Admin**: admin@vastoffice.com / admin123
- **Mechanics**: [email] / password123
  - john.smith@vastoffice.com
  - sarah.johnson@vastoffice.com
  - mike.davis@vastoffice.com

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Inspections
- `GET /api/inspections` - List all inspections
- `GET /api/inspections/:id` - Get inspection details
- `POST /api/inspections` - Create new inspection
- `PUT /api/inspections/:id` - Update inspection
- `POST /api/inspections/:id/items` - Add line item

### Mechanics
- `GET /api/mechanics` - List all mechanics
- `GET /api/mechanics/:id` - Get mechanic details
- `GET /api/mechanics/:id/stats` - Get mechanic statistics

## 🚀 Deployment

### Azure Deployment

1. **Create Azure SQL Database**
2. **Deploy Backend to App Service**
3. **Deploy Frontend to Static Web Apps**
4. **Configure environment variables**
5. **Enable custom domain and SSL**

### Docker Deployment

```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.
            
