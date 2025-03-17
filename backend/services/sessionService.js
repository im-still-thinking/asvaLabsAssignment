import { createClient } from 'redis';
import Session from '../models/Session.js';

class SessionService {
  constructor() {
    this.redisClient = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Connect to Redis
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
      });

      await this.redisClient.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.redisClient) {
      try {
        if (this.isConnected) {
          await this.redisClient.quit();
        }
        this.isConnected = false;
      } catch (error) {
        console.error('Error disconnecting from Redis:', error);
      }
    }
  }

  // Create a new session for a topic
  async createSession(topicData) {
    try {
      // Create a new session in MongoDB
      const session = new Session({
        topicId: topicData.id,
        title: topicData.title,
        changeType: topicData.changeType,
        changeValue: topicData.changeValue,
        status: topicData.status || 'active',
        createdAt: topicData.createdAt || new Date(),
        votes: topicData.votes || [],
        changeRequests: [{
          prompt: topicData.description || '',
          interpretation: topicData.interpretation || null,
          timestamp: new Date()
        }],
        metadata: {
          originalRequest: topicData
        }
      });

      await session.save();

      // Cache session in Redis for fast lookups
      if (this.isConnected) {
        await this.redisClient.set(
          `session:${topicData.id}`,
          JSON.stringify(session),
          { EX: 3600 } // Expire after 1 hour
        );
      }

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Get a session by topic ID
  async getSessionByTopicId(topicId) {
    try {
      // Try to get from Redis first
      if (this.isConnected) {
        const cachedSession = await this.redisClient.get(`session:${topicId}`);
        if (cachedSession) {
          return JSON.parse(cachedSession);
        }
      }

      // If not in Redis, get from MongoDB
      const session = await Session.findOne({ topicId });
      
      // Cache in Redis if found
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 } // Expire after 1 hour
        );
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  // Update session status
  async updateSessionStatus(topicId, status, endedAt = null) {
    try {
      const updateData = { status };
      if (endedAt) {
        updateData.endedAt = endedAt;
      }

      const session = await Session.findOneAndUpdate(
        { topicId },
        updateData,
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  // Add a vote to a session
  async addVote(topicId, voteData) {
    try {
      const session = await Session.findOneAndUpdate(
        { topicId },
        { $push: { votes: voteData } },
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error adding vote to session:', error);
      throw error;
    }
  }

  // Add a node interaction to a session
  async addNodeInteraction(topicId, interactionData) {
    try {
      const session = await Session.findOneAndUpdate(
        { topicId },
        { $push: { nodeInteractions: interactionData } },
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error adding node interaction to session:', error);
      throw error;
    }
  }

  // Add a message to a session
  async addMessage(topicId, messageData) {
    try {
      const session = await Session.findOneAndUpdate(
        { topicId },
        { $push: { messages: messageData } },
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw error;
    }
  }

  // Add a decision to a session
  async addDecision(topicId, decisionData) {
    try {
      const session = await Session.findOneAndUpdate(
        { topicId },
        { $push: { decisions: decisionData } },
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error adding decision to session:', error);
      throw error;
    }
  }

  // Set the final decision for a session
  async setFinalDecision(topicId, finalDecisionData) {
    try {
      const session = await Session.findOneAndUpdate(
        { topicId },
        { 
          finalDecision: {
            ...finalDecisionData,
            timestamp: new Date()
          },
          status: finalDecisionData.approved ? 'approved' : 'rejected',
          endedAt: new Date()
        },
        { new: true }
      );

      // Update Redis cache
      if (session && this.isConnected) {
        await this.redisClient.set(
          `session:${topicId}`,
          JSON.stringify(session),
          { EX: 3600 }
        );
      }

      return session;
    } catch (error) {
      console.error('Error setting final decision for session:', error);
      throw error;
    }
  }

  // Get all sessions
  async getAllSessions(limit = 100, skip = 0, filter = {}) {
    try {
      return await Session.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      throw error;
    }
  }

  // Get active sessions
  async getActiveSessions() {
    try {
      return await Session.find({ status: 'active' }).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  // Clear Redis cache for a session
  async clearSessionCache(topicId) {
    if (this.isConnected) {
      await this.redisClient.del(`session:${topicId}`);
    }
  }
}

export default new SessionService(); 