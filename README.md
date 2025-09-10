# GPT Webhook Server

A simple Node.js Express server built with TypeScript for handling ChatGPT webhooks with MongoDB integration.

## Features

- ✅ TypeScript-based Express server
- ✅ MongoDB integration with fallback to in-memory logging
- ✅ Webhook endpoint: `POST /nahui-gpt/income`
- ✅ Comprehensive logging of incoming webhook data
- ✅ Health check endpoint: `GET /health`
- ✅ Docker containerization
- ✅ CapRover deployment ready
- ✅ Security middleware (Helmet, CORS)
- ✅ Graceful shutdown handling

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGO_URL` | MongoDB connection URL | `undefined` (runs without persistence) |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### POST /nahui-gpt/income
Main webhook endpoint for receiving ChatGPT data.

**Request Body:** Any JSON data
**Response:** 
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "id": "mongodb_document_id"
}
```

### GET /health
Health check endpoint to verify server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Deployment

### Docker
```bash
# Build image
docker build -t gpt-webhook-server .

# Run container
docker run -p 3000:3000 -e MONGO_URL="your-mongodb-url" gpt-webhook-server
```

### CapRover
This project includes `captain-definition` file for CapRover deployment. Simply:

1. Push to your repository
2. Deploy via CapRover dashboard
3. Set environment variables in CapRover app settings

## Data Storage

- **With MongoDB**: All webhook data is stored in the `webhooks` collection
- **Without MongoDB**: Data is logged to console only

## Logging

The server logs:
- All incoming webhook requests (headers, body, query parameters)
- MongoDB connection status
- Database operation results
- Server startup and shutdown events