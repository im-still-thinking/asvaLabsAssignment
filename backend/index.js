import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import { CodeAgent, PolicyAgent, VoteAgent } from './agents/index.js'
import { MessageTypes } from './p2p/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const server = http.createServer(app)

const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

let voteAgent, policyAgent, codeAgent

const connectedClients = new Map()

const mockUsers = [
  { id: 'user_1', username: 'user1', followers: 150 },
  { id: 'user_2', username: 'user2', followers: 200 },
  { id: 'user_3', username: 'user3', followers: 75 }
];

const mockTopics = [];

const p2pMessages = [];


function addP2PMessage(message) {
  const messageWithId = {
    ...message,
    id: `${message.type}_${message.timestamp}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  const isDuplicate = p2pMessages.some(existingMsg => 
    existingMsg.type === message.type && 
    existingMsg.content === message.content &&
    Math.abs(existingMsg.timestamp - message.timestamp) < 2000
  );
  
  if (!isDuplicate) {
    p2pMessages.push(messageWithId);
    if (p2pMessages.length > 20) {
      p2pMessages.shift();
    }
    return true;
  }
  
  return false;
}


function sendWebSocketMessage(ws, type, payload) {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcastWebSocketMessage(type, payload) {
  for (const client of connectedClients.values()) {
    sendWebSocketMessage(client, type, payload);
  }
}

function sendP2PInfo(ws) {
  if (!voteAgent || !policyAgent || !codeAgent) return;
  
  const p2pInfo = {
    peerId: 'frontend-client',
    peers: [
      voteAgent.node.node.peerId.toString(),
      policyAgent.node.node.peerId.toString(),
      codeAgent.node.node.peerId.toString()
    ],
    messages: [...p2pMessages]
  };
  
  sendWebSocketMessage(ws, 'P2P_INFO', p2pInfo);
}


function broadcastP2PInfo() {
  if (!voteAgent || !policyAgent || !codeAgent) return;
  
  const p2pInfo = {
    peerId: 'frontend-client',
    peers: [
      voteAgent.node.node.peerId.toString(),
      policyAgent.node.node.peerId.toString(),
      codeAgent.node.node.peerId.toString()
    ],
    messages: [...p2pMessages]
  };
  
  broadcastWebSocketMessage('P2P_INFO', p2pInfo);
}

function broadcastP2PMessage(message) {
  const added = addP2PMessage(message);
  
  if (added) {
    broadcastWebSocketMessage('P2P_INFO', { messages: [message] });
  }
}

function broadcastTopicUpdate(topic) {
  broadcastWebSocketMessage('TOPIC_UPDATE', topic);
}

function broadcastSettingsUpdate(settings) {
  broadcastWebSocketMessage('SETTINGS_UPDATE', settings);
}

const globalSettings = {
  primaryColor: '#3b82f6',
  fontFamily: 'Inter, sans-serif',
};


function updateTopicStatusFromCodeApplied(data) {
  console.log('Updating topic status from code applied:', data);
  
  const matchingTopics = mockTopics.filter(topic => {
    const statusMatch = topic.status === 'applying';
    
    const typeMatch = topic.changeType.toLowerCase() === (data.changeType || '').toLowerCase();
    
    const normalizeValue = (val) => (val || '').toString().toLowerCase().replace(/\s+/g, '');
    const valueMatch = normalizeValue(topic.changeValue) === normalizeValue(data.changeValue);
    
    if (statusMatch && (!typeMatch || !valueMatch)) {
      console.log('Partial match found:', {
        topic: {
          id: topic.id,
          status: topic.status,
          changeType: topic.changeType,
          changeValue: topic.changeValue
        },
        message: {
          changeType: data.changeType,
          changeValue: data.changeValue
        },
        matches: {
          status: statusMatch,
          type: typeMatch,
          value: valueMatch
        }
      });
    }
    
    return statusMatch && typeMatch && valueMatch;
  });
  
  console.log('Matching topics found:', matchingTopics.length);
  
  for (const topic of matchingTopics) {
    const topicIndex = mockTopics.findIndex(t => t.id === topic.id);
    if (topicIndex !== -1) {
      console.log(`Updating topic ${topic.id} status from ${mockTopics[topicIndex].status} to ${data.success ? 'completed' : 'error'}`);
      mockTopics[topicIndex].status = data.success ? 'completed' : 'error';
      broadcastTopicUpdate(mockTopics[topicIndex]);
      console.log(`Topic status updated and broadcasted`);
    }
  }
  
  if (matchingTopics.length === 0) {
    console.log('No matching topics found for CODE_APPLIED message. Message data:', {
      changeType: data.changeType,
      changeValue: data.changeValue,
      success: data.success
    });
    
    const applyingTopics = mockTopics.filter(topic => topic.status === 'applying');
    if (applyingTopics.length > 0) {
      console.log('Found topics in "applying" status that did not match exactly:', 
        applyingTopics.map(t => ({ id: t.id, changeType: t.changeType, changeValue: t.changeValue }))
      );
      
      const mostRecentTopic = applyingTopics.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (mostRecentTopic) {
        console.log(`Updating most recent topic ${mostRecentTopic.id} as fallback`);
        const topicIndex = mockTopics.findIndex(t => t.id === mostRecentTopic.id);
        if (topicIndex !== -1) {
          mockTopics[topicIndex].status = data.success ? 'completed' : 'error';
          broadcastTopicUpdate(mockTopics[topicIndex]);
          console.log(`Topic status updated and broadcasted (fallback)`);
        }
      }
    }
  }
}

global.updateTopicStatusFromCodeApplied = updateTopicStatusFromCodeApplied;


async function initializeAgents() {
  try {
    console.log('Initializing agents...');
    
    voteAgent = await new VoteAgent().init();
    console.log('Vote agent initialized');
    
    policyAgent = await new PolicyAgent().init();
    console.log('Policy agent initialized');
    
    codeAgent = await new CodeAgent().init();
    console.log('Code agent initialized');
    
    const handleAgentMessage = (agentName) => (message) => {
      if (message.type === 'agent_info') return;
      
      if (agentName === 'Code Agent' && message.type === MessageTypes.SETTINGS_UPDATE) {
        globalSettings.primaryColor = message.data.primaryColor;
        globalSettings.fontFamily = message.data.fontFamily;
        
        broadcastSettingsUpdate(message.data);
      }
      
      if (agentName === 'Code Agent' && message.type === MessageTypes.CODE_APPLIED) {
        updateTopicStatusFromCodeApplied(message.data);
      }
      
      const p2pMessage = {
        type: message.type,
        content: `${agentName}: ${message.type} - ${JSON.stringify(message.data).substring(0, 50)}...`,
        timestamp: Date.now()
      };
      
      broadcastP2PMessage(p2pMessage);
    };
    
    voteAgent.node.registerMessageHandler('*', handleAgentMessage('Vote Agent'));
    policyAgent.node.registerMessageHandler('*', handleAgentMessage('Policy Agent'));
    codeAgent.node.registerMessageHandler('*', handleAgentMessage('Code Agent'));
    
    console.log('All agents initialized successfully');
  } catch (error) {
    console.error('Failed to initialize agents:', error);
    process.exit(1);
  }
}


function findUserByUsername(username) {
  return mockUsers.find(user => user.username === username);
}


// API endpoints
app.post('/api/users/login', (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Check if user exists or create a new one
    let user = findUserByUsername(username);
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        username,
        followers: Math.floor(Math.random() * 200) + 50,
      };
      mockUsers.push(user);
    }
    
    addP2PMessage({
      type: 'user_login',
      content: `User ${username} logged in`,
      timestamp: Date.now()
    });
    
    broadcastP2PInfo();
    res.json(user);
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/topics', (req, res) => {
  res.json(mockTopics);
});

app.get('/api/settings', (req, res) => {
  res.json(globalSettings);
});

app.post('/api/topics', (req, res) => {
  try {
    const topicData = req.body;
    
    if (!topicData || !topicData.title || !topicData.changeType || !topicData.changeValue) {
      return res.status(400).json({ error: 'Invalid topic data' });
    }
    
    const newTopic = {
      id: `topic_${Date.now()}`,
      createdAt: new Date(),
      votes: [],
      status: 'active',
      ...topicData,
    };
    
    mockTopics.push(newTopic);
    broadcastTopicUpdate(newTopic);
    res.json(newTopic);
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.post('/api/topics/:topicId/vote', (req, res) => {
  try {
    const { topicId } = req.params;
    const { userId, vote, influence } = req.body;
    
    if (!userId || !vote) {
      return res.status(400).json({ error: 'Invalid vote data' });
    }
    
    const topicIndex = mockTopics.findIndex(topic => topic.id === topicId);
    if (topicIndex === -1) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    const topic = mockTopics[topicIndex];
    
    const existingVoteIndex = topic.votes.findIndex(v => v.userId === userId);
    if (existingVoteIndex !== -1) {
      topic.votes[existingVoteIndex] = { userId, vote, influence };
    } else {
      topic.votes.push({ userId, vote, influence });
    }
    
    mockTopics[topicIndex] = topic;
    broadcastTopicUpdate(topic);
    res.json(topic);
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

app.post('/api/votes', async (req, res) => {
  try {
    const votingData = req.body;
    
    if (!votingData || !votingData.votes || !votingData.changeType || !votingData.changeValue) {
      return res.status(400).json({ error: 'Invalid voting data' });
    }
    
    const voteSummary = await voteAgent.processVotes(votingData);
    
    if (votingData.topicId) {
      const topicIndex = mockTopics.findIndex(topic => topic.id === votingData.topicId);
      
      if (topicIndex !== -1) {
        const approved = voteSummary.recommendation === 'approve';
        
        mockTopics[topicIndex].status = approved ? 'applying' : 'rejected';
        mockTopics[topicIndex].endTime = new Date();
        
        broadcastTopicUpdate(mockTopics[topicIndex]);
        broadcastP2PInfo();
      }
    }
    
    const result = {
      ...voteSummary,
      result: {
        approved: voteSummary.recommendation === 'approve'
      }
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error processing votes:', error);
    res.status(500).json({ error: 'Failed to process votes' });
  }
});

app.post('/api/interpret', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    
    console.log(`Received interpretation request: "${prompt}"`);
    
    const interpretation = await voteAgent.interpretPrompt(prompt);
    
    res.json({ topicData: interpretation });
  } catch (error) {
    console.error('Error interpreting prompt:', error);
    res.status(500).json({ error: 'Failed to interpret prompt' });
  }
});


wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'AUTH' && data.userId) {
        connectedClients.set(data.userId, ws);
        console.log(`User ${data.userId} authenticated via WebSocket`);
        sendP2PInfo(ws);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    
    for (const [userId, client] of connectedClients.entries()) {
      if (client === ws) {
        connectedClients.delete(userId);
        console.log(`User ${userId} disconnected`);
        broadcastP2PInfo();
        break;
      }
    }
  });
});


server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeAgents();
});


process.on('SIGINT', async () => {
  console.log('Shutting down...');
  
  if (voteAgent) await voteAgent.stop();
  if (policyAgent) await policyAgent.stop();
  if (codeAgent) await codeAgent.stop();
  
  process.exit(0);
}); 