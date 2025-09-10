import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { MongoClient, Db, Collection } from 'mongodb';

interface WebhookRequest {
  _id?: any;
  message: string;
  userInfo: any;
  timestamp: Date;
  fullRequest: any;
}

interface WebhookData {
  message?: string;
  user?: any;
  [key: string]: any;
}

class WebhookServer {
  private app: Application;
  private port: number;
  private mongoUrl: string | undefined;
  private db: Db | null = null;
  private client: MongoClient | null = null;
  private webhooksCollection: Collection<WebhookRequest> | null = null;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.mongoUrl = process.env.MONGO_URL;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    
    // Logging
    this.app.use(morgan('combined'));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Error handling middleware
    this.app.use(this.errorHandler.bind(this));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: this.db ? 'connected' : 'not connected'
      });
    });

    // Main webhook endpoint
    this.app.post('/nahui-gpt/income', this.handleWebhook.bind(this));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('=== Webhook Received ===');
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Body:', JSON.stringify(req.body, null, 2));
      console.log('Query:', JSON.stringify(req.query, null, 2));
      console.log('========================');

      const webhookData: WebhookData = req.body;
      
      // Extract message and user info from the webhook data
      const message = webhookData.message || webhookData.text || JSON.stringify(webhookData);
      const userInfo = webhookData.user || webhookData.userInfo || { ip: req.ip, userAgent: req.get('User-Agent') };

      const requestRecord: WebhookRequest = {
        message,
        userInfo,
        timestamp: new Date(),
        fullRequest: {
          headers: req.headers,
          body: req.body,
          query: req.query,
          method: req.method,
          url: req.url
        }
      };

      // Try to save to MongoDB if available
      if (this.webhooksCollection) {
        try {
          const result = await this.webhooksCollection.insertOne(requestRecord);
          console.log('Webhook saved to MongoDB with ID:', result.insertedId);
          requestRecord._id = result.insertedId;
        } catch (dbError) {
          console.error('Failed to save to MongoDB:', dbError);
          // Continue execution even if DB save fails
        }
      } else {
        console.log('MongoDB not available, webhook data logged only');
      }

      // Always respond with success
      res.status(200).json({
        success: true,
        message: 'Webhook received and processed',
        timestamp: requestRecord.timestamp,
        id: requestRecord._id
      });

    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }

  private async connectToMongoDB(): Promise<void> {
    if (!this.mongoUrl) {
      console.log('No MONGO_URL provided, running without database persistence');
      return;
    }

    try {
      console.log('Connecting to MongoDB...');
      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      this.db = this.client.db('webhook-server');
      this.webhooksCollection = this.db.collection<WebhookRequest>('webhooks');
      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.log('Continuing without database persistence...');
    }
  }

  public async start(): Promise<void> {
    try {
      // Try to connect to MongoDB
      await this.connectToMongoDB();

      // Start the server
      this.app.listen(this.port, () => {
        console.log(`🚀 Webhook server running on port ${this.port}`);
        console.log(`📊 Health check available at: http://localhost:${this.port}/health`);
        console.log(`🎯 Webhook endpoint: http://localhost:${this.port}/nahui-gpt/income`);
        console.log(`💾 Database: ${this.db ? 'MongoDB connected' : 'In-memory logging only'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('Shutting down server...');
    
    if (this.client) {
      try {
        await this.client.close();
        console.log('MongoDB connection closed');
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      }
    }
    
    process.exit(0);
  }
}

// Start the server
const server = new WebhookServer();
server.start().catch(error => {
  console.error('Failed to start webhook server:', error);
  process.exit(1);
});