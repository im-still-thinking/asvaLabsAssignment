import { AppSettings, P2PInfo, Topic, User, Vote } from '@/types';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Voting threshold configuration
const VOTING_CONFIG = {
  // Minimum number of votes required to process a topic
  MIN_VOTES_THRESHOLD: 3,
  // Percentage of yes votes required for approval (0-100)
  APPROVAL_PERCENTAGE: 60,
  // Maximum time a topic can be active (in milliseconds) - as a fallback
  MAX_VOTING_TIME: 5 * 60 * 1000, // 5 minutes
};

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API endpoints
const ENDPOINTS = {
  LOGIN: `${API_URL}/api/users/login`,
  TOPICS: `${API_URL}/api/topics`,
  SETTINGS: `${API_URL}/api/settings`,
  VOTES: `${API_URL}/api/votes`,
  INTERPRET: `${API_URL}/api/interpret`,
};

// WebSocket message types
const WS_MESSAGE_TYPES = {
  AUTH: 'AUTH',
  P2P_INFO: 'P2P_INFO',
  TOPIC_UPDATE: 'TOPIC_UPDATE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
};

interface AppContextType {
  currentUser: User | null;
  topics: Topic[];
  settings: AppSettings;
  p2pInfo: P2PInfo;
  votingConfig: typeof VOTING_CONFIG;
  login: (username: string) => Promise<void>;
  logout: () => void;
  createTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'endTime' | 'votes' | 'status'>) => Promise<Topic>;
  castVote: (topicId: string, vote: 'yes' | 'no') => Promise<void>;
  createTopicFromNaturalLanguage: (prompt: string) => Promise<Topic>;
  isConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  primaryColor: '#3b82f6',
  fontFamily: 'Inter, sans-serif',
};

const defaultP2PInfo: P2PInfo = {
  peerId: '',
  peers: [],
  messages: [],
};

const apiService = {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  },
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [p2pInfo, setP2PInfo] = useState<P2PInfo>(defaultP2PInfo);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messageHandlers = useMemo(() => ({
    [WS_MESSAGE_TYPES.P2P_INFO]: (payload: any) => {
      if (payload.peers) {
        // Full P2P info update
        setP2PInfo(payload);
      } else if (payload.messages && payload.messages.length > 0) {
        // Partial update with just messages
        setP2PInfo(prevInfo => {
          // Create a map of existing messages by ID to avoid duplicates
          const existingMessages = new Map<string, boolean>();
          prevInfo.messages.forEach(msg => {
            const key = msg.id || `${msg.content}_${msg.timestamp}`;
            existingMessages.set(key, true);
          });
          
          // Filter out duplicate messages
          const newMessages = payload.messages.filter((msg: any) => {
            const key = msg.id || `${msg.content}_${msg.timestamp}`;
            return !existingMessages.has(key);
          });
          
          // Only update if we have new messages
          if (newMessages.length === 0) {
            return prevInfo;
          }
          
          // Combine messages and limit to most recent 20
          const combinedMessages = [...prevInfo.messages, ...newMessages];
          const limitedMessages = combinedMessages.slice(-20);
          
          return {
            ...prevInfo,
            messages: limitedMessages
          };
        });
      }
    },
    [WS_MESSAGE_TYPES.TOPIC_UPDATE]: (payload: Topic) => {
      setTopics(prevTopics => {
        const existingIndex = prevTopics.findIndex(t => t.id === payload.id);
        if (existingIndex >= 0) {
          // Update existing topic
          return [
            ...prevTopics.slice(0, existingIndex),
            payload,
            ...prevTopics.slice(existingIndex + 1)
          ];
        } else {
          // Add new topic
          return [...prevTopics, payload];
        }
      });
    },
    [WS_MESSAGE_TYPES.SETTINGS_UPDATE]: (payload: AppSettings) => {
      setSettings(payload);
    }
  }), []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!currentUser) return;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      const ws = new WebSocket(`ws://${API_URL.replace(/^https?:\/\//, '')}/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: WS_MESSAGE_TYPES.AUTH,
          userId: currentUser.id
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = messageHandlers[data.type];
          
          if (handler) {
            handler(data.payload);
          } else {
            console.log('Received unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (currentUser) {
            console.log('Attempting to reconnect WebSocket...');
            initializeWebSocket();
          }
        }, 5000);
      };
      
      socketRef.current = ws;
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setIsConnected(false);
    }
  }, [currentUser, messageHandlers]);

  // Initialize WebSocket when user logs in
  useEffect(() => {
    if (currentUser) {
      initializeWebSocket();
    }
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [currentUser, initializeWebSocket]);

  // Apply settings to document
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--font-family', settings.fontFamily);
  }, [settings]);

  // Check for topics that have been active for too long
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Find topics that have been active for too long
      const longActiveTopics = topics.filter(
        topic => topic.status === 'active' && 
                (now.getTime() - new Date(topic.createdAt).getTime()) > VOTING_CONFIG.MAX_VOTING_TIME
      );
      
      // Process each topic that's been active too long
      longActiveTopics.forEach(topic => {
        processVotes(topic.id);
      });
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [topics]);

  // Fetch topics from backend
  const fetchTopics = useCallback(async () => {
    try {
      const data = await apiService.get<Topic[]>(ENDPOINTS.TOPICS);
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  }, []);

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiService.get<AppSettings>(ENDPOINTS.SETTINGS);
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // Login function
  const login = useCallback(async (username: string) => {
    try {
      const user = await apiService.post<User>(ENDPOINTS.LOGIN, { username });
      setCurrentUser({ ...user, isLoggedIn: true });
      
      // Fetch initial data
      await Promise.all([
        fetchTopics(),
        fetchSettings()
      ]);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [fetchSettings, fetchTopics]);

  // Logout function
  const logout = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setCurrentUser(null);
    setIsConnected(false);
  }, []);

  // Create a new topic
  const createTopic = useCallback(async (topicData: Omit<Topic, 'id' | 'createdAt' | 'endTime' | 'votes' | 'status'>) => {
    if (!currentUser) throw new Error('You must be logged in to create a topic');
    
    try {
      const newTopic = await apiService.post<Topic>(ENDPOINTS.TOPICS, {
        ...topicData,
        createdBy: currentUser.id,
      });
      
      return newTopic;
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }, [currentUser]);

  // Cast a vote on a topic
  const castVote = useCallback(async (topicId: string, vote: 'yes' | 'no') => {
    if (!currentUser) throw new Error('You must be logged in to vote');
    
    try {
      const voteData: Vote = {
        userId: currentUser.id,
        vote,
        influence: currentUser.followers,
      };
      
      const updatedTopic = await apiService.post<Topic>(
        `${ENDPOINTS.TOPICS}/${topicId}/vote`, 
        voteData
      );
      
      // Check if voting threshold has been reached
      if (updatedTopic.votes.length >= VOTING_CONFIG.MIN_VOTES_THRESHOLD) {
        await processVotes(topicId);
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }, [currentUser]);

  // Process votes for a topic
  const processVotes = useCallback(async (topicId: string) => {
    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic || topic.status !== 'active') return;
      
      // Update topic status to processing
      setTopics(prevTopics => 
        prevTopics.map(t => 
          t.id === topicId ? { ...t, status: 'processing' } : t
        )
      );
      
      // Send to backend for processing
      const votingData = {
        topicId: topic.id,
        changeType: topic.changeType,
        changeValue: topic.changeValue,
        votes: topic.votes,
      };
      
      await apiService.post(ENDPOINTS.VOTES, votingData);
      
      // The topic status will be updated via WebSocket
    } catch (error) {
      console.error('Error processing votes:', error);
      
      // Update topic status to error
      setTopics(prevTopics => 
        prevTopics.map(t => 
          t.id === topicId ? { ...t, status: 'error' } : t
        )
      );
      
      throw error;
    }
  }, [topics]);

  // Create a topic from natural language
  const createTopicFromNaturalLanguage = useCallback(async (prompt: string) => {
    if (!currentUser) throw new Error('You must be logged in to create a topic');
    
    try {
      const result = await apiService.post<{ topicData: any }>(
        ENDPOINTS.INTERPRET, 
        { prompt, userId: currentUser.id }
      );
      
      // Create the topic with the interpreted data
      const topicData = {
        title: result.topicData.title,
        description: prompt,
        changeType: result.topicData.changeType,
        changeValue: result.topicData.changeValue,
        createdBy: currentUser.id,
      };
      
      // Use the createTopic function to actually create the topic
      return await createTopic(topicData);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw new Error('Failed to create topic');
    }
  }, [createTopic, currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    topics,
    settings,
    p2pInfo,
    votingConfig: VOTING_CONFIG,
    login,
    logout,
    createTopic,
    castVote,
    createTopicFromNaturalLanguage,
    isConnected,
  }), [
    currentUser, 
    topics, 
    settings, 
    p2pInfo, 
    login, 
    logout, 
    createTopic, 
    castVote, 
    createTopicFromNaturalLanguage,
    isConnected
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 