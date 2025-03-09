import { AppSettings, Topic, User } from '@/types';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Mock users data
const mockUsers = [
  { id: '1', username: 'user1', followers: 100 },
  { id: '2', username: 'user2', followers: 50 },
  { id: '3', username: 'user3', followers: 200 },
  { id: '4', username: 'user4', followers: 75 },
  { id: '5', username: 'user5', followers: 150 },
];

interface AppContextType {
  currentUser: User | null;
  topics: Topic[];
  settings: AppSettings;
  login: (username: string) => void;
  logout: () => void;
  createTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'endTime' | 'votes' | 'status'>) => void;
  castVote: (topicId: string, vote: 'yes' | 'no') => void;
  createTopicFromNaturalLanguage: (prompt: string) => void;
}

const defaultSettings: AppSettings = {
  primaryColor: '#3b82f6', // blue-500
  fontFamily: 'Inter, sans-serif',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Login function
  const login = (username: string) => {
    const user = mockUsers.find(u => u.username === username);
    if (user) {
      setCurrentUser({ ...user, isLoggedIn: true });
    }
  };

  // Logout function
  const logout = () => {
    setCurrentUser(null);
  };

  // Create a new topic
  const createTopic = (topicData: Omit<Topic, 'id' | 'createdAt' | 'endTime' | 'votes' | 'status'>) => {
    if (!currentUser) return; // Early return if no user is logged in
    
    const endTime = new Date();
    endTime.setSeconds(endTime.getSeconds() + 30); // 30 seconds instead of 5 minutes
    
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      createdAt: new Date(),
      endTime,
      votes: [],
      status: 'active' as const,
      ...topicData,
      createdBy: currentUser.id,
    };
    
    setTopics([...topics, newTopic]);
  };

  // Cast a vote on a topic
  const castVote = (topicId: string, vote: 'yes' | 'no') => {
    if (!currentUser) return;

    setTopics(prevTopics => 
      prevTopics.map(topic => {
        if (topic.id === topicId && topic.status === 'active') {
          // Check if user already voted
          const existingVoteIndex = topic.votes.findIndex(v => v.userId === currentUser.id);
          
          if (existingVoteIndex >= 0) {
            // Update existing vote
            const updatedVotes = [...topic.votes];
            updatedVotes[existingVoteIndex] = {
              userId: currentUser.id,
              vote: vote,
              influence: currentUser.followers,
            };
            return { ...topic, votes: updatedVotes };
          } else {
            // Add new vote
            return {
              ...topic,
              votes: [
                ...topic.votes,
                {
                  userId: currentUser.id,
                  vote: vote,
                  influence: currentUser.followers,
                },
              ],
            };
          }
        }
        return topic;
      })
    );
  };

  // Process votes when a topic's voting period ends
  const processVotes = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || topic.status !== 'active') return;

    // Mark the topic as completed
    setTopics(prevTopics =>
      prevTopics.map(t =>
        t.id === topicId ? { ...t, status: 'completed' } : t
      )
    );

    try {
      // Send the votes to the backend for processing
      const response = await fetch('http://localhost:3001/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changeType: topic.changeType,
          changeValue: topic.changeValue,
          votes: topic.votes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process votes');
      }

      const result = await response.json();
      console.log('Vote processing result:', result);

      // Update the topic status based on the recommendation
      setTopics(prevTopics =>
        prevTopics.map(t =>
          t.id === topicId
            ? {
                ...t,
                status: result.recommendation === 'approve' ? 'approved' : 'rejected',
              }
            : t
        )
      );

      // If approved, update the app settings
      if (result.recommendation === 'approve') {
        const newSettings = { ...settings };
        
        if (topic.changeType === 'color') {
          newSettings.primaryColor = topic.changeValue;
        } else if (topic.changeType === 'font') {
          newSettings.fontFamily = topic.changeValue;
        }
        
        setSettings(newSettings);
        localStorage.setItem('appSettings', JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Error processing votes:', error);
    }
  };

  useEffect(() => {
    // Check for topics that have ended but are still active
    const interval = setInterval(() => {
      const now = new Date();
      
      // Find topics that have ended but are still active
      const endedTopics = topics.filter(
        topic => topic.status === 'active' && new Date(topic.endTime) <= now
      );
      
      // Process each ended topic
      endedTopics.forEach(async (topic) => {
        try {
          // Update topic status to prevent multiple processing
          setTopics(prev => 
            prev.map(t => 
              t.id === topic.id ? { ...t, status: 'processing' } : t
            )
          );
          
          // Send to backend for processing
          const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              changeType: topic.changeType,
              changeValue: topic.changeValue,
              votes: topic.votes,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Vote processing result:', result);
            
            // Update topic with result
            setTopics(prev => 
              prev.map(t => 
                t.id === topic.id ? { 
                  ...t, 
                  status: result.result?.recommendation === 'approve' ? 'approved' : 'rejected' 
                } : t
              )
            );
            
            // If approved, update settings
            if (result.result?.recommendation === 'approve') {
              if (topic.changeType === 'color') {
                setSettings(prev => ({ ...prev, primaryColor: topic.changeValue }));
              } else if (topic.changeType === 'font') {
                setSettings(prev => ({ ...prev, fontFamily: topic.changeValue }));
              }
            }
          } else {
            // Handle error response
            console.error('Error processing votes:', await response.text());
            setTopics(prev => 
              prev.map(t => 
                t.id === topic.id ? { ...t, status: 'error' } : t
              )
            );
          }
        } catch (error) {
          console.error('Error processing ended topic:', error);
          // Mark topic as error
          setTopics(prev => 
            prev.map(t => 
              t.id === topic.id ? { ...t, status: 'error' } : t
            )
          );
        }
      });
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [topics]);

  const createTopicFromNaturalLanguage = async (prompt: string) => {
    if (!currentUser) return;
    
    try {
      // Send the prompt to the backend for interpretation by the vote agent
      const response = await fetch('/api/createTopic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userId: currentUser.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to interpret prompt');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.topicData) {
        throw new Error('Invalid response from server');
      }
      
      // Create the topic with the interpreted data
      const endTime = new Date();
      endTime.setSeconds(endTime.getSeconds() + 30); // 30 seconds
      
      const newTopic: Topic = {
        id: `topic-${Date.now()}`,
        createdAt: new Date(),
        endTime,
        votes: [],
        status: 'active' as const, // Explicitly type as a literal
        title: result.topicData.title,
        description: prompt, // Use the original prompt as the description
        changeType: result.topicData.changeType as 'color' | 'font', // Type assertion
        changeValue: result.topicData.changeValue,
        createdBy: currentUser.id,
      };
      
      setTopics([...topics, newTopic]);
    } catch (error) {
      console.error('Error creating topic from natural language:', error);
      throw new Error('Failed to interpret your request. Please try again with a clearer description.');
    }
  };

  const value = {
    currentUser,
    topics,
    settings,
    login,
    logout,
    createTopic,
    castVote,
    createTopicFromNaturalLanguage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 