import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { CodeAgent, PolicyAgent, VoteAgent } from './agents/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize agents
let voteAgent, policyAgent, codeAgent

async function initializeAgents() {
  try {
    console.log('Initializing agents...')
    
    voteAgent = await new VoteAgent().init()
    console.log('Vote agent initialized')
    
    policyAgent = await new PolicyAgent().init()
    console.log('Policy agent initialized')
    
    codeAgent = await new CodeAgent().init()
    console.log('Code agent initialized')
    
    console.log('All agents initialized successfully')
  } catch (error) {
    console.error('Failed to initialize agents:', error)
    process.exit(1)
  }
}

// API routes
app.post('/api/votes', async (req, res) => {
  try {
    const votingData = req.body
    
    if (!votingData || !votingData.votes || !votingData.changeType || !votingData.changeValue) {
      return res.status(400).json({ error: 'Invalid voting data' })
    }
    
    const result = await voteAgent.processVotes(votingData)
    res.json(result)
  } catch (error) {
    console.error('Error processing votes:', error)
    res.status(500).json({ error: 'Failed to process votes' })
  }
})

// Add this new endpoint
app.post('/api/interpret', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }
    
    console.log(`Received interpretation request: "${prompt}"`);
    
    // Send to vote agent for interpretation
    const interpretation = await voteAgent.interpretPrompt(prompt);
    
    res.json({ topicData: interpretation });
  } catch (error) {
    console.error('Error interpreting prompt:', error);
    res.status(500).json({ error: 'Failed to interpret prompt' });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  await initializeAgents()
})

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  
  if (voteAgent) await voteAgent.stop()
  if (policyAgent) await policyAgent.stop()
  if (codeAgent) await codeAgent.stop()
  
  process.exit(0)
}) 