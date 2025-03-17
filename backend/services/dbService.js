import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

class DatabaseService {
  constructor() {
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/p2p-ai-agents';
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('Already connected to MongoDB');
        return;
      }

      // Set mongoose options
      mongoose.set('strictQuery', false);

      // Connect to MongoDB
      await mongoose.connect(this.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
}

export default new DatabaseService(); 