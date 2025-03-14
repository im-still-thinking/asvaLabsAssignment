import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { processPromptWithLLM, processVotesWithLLM } from '../services/llmService.js'

class VoteAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'vote' })
    this.policyAgentPeerId = null
  }

  async init() {
    await this.node.init()
    
    this.node.registerMessageHandler(MessageTypes.AGENT_INFO, this.handleAgentInfo.bind(this))
    this.node.registerMessageHandler(MessageTypes.POLICY_DECISION, this.handlePolicyDecision.bind(this))
    
    setTimeout(() => {
      this.broadcastAgentInfo()
    }, 5000)
    
    return this
  }

  async handleAgentInfo(message) {
    if (message.data.agentType === 'policy') {
      this.policyAgentPeerId = message.sender
      console.log('Discovered policy agent:', this.policyAgentPeerId)
    }
  }

  async handlePolicyDecision(message) {
    console.log('Received policy decision:', message.data)
  }

  async broadcastAgentInfo() {
    const message = createMessage(
      MessageTypes.AGENT_INFO,
      { agentType: 'vote' },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(message)
  }

  async processVotes(votingData) {
    console.log('Processing votes:', votingData)
    
    const voteSummary = await processVotesWithLLM(votingData)
    
    if (this.policyAgentPeerId) {
      const message = createMessage(
        MessageTypes.VOTE_SUMMARY,
        voteSummary,
        this.node.node.peerId.toString()
      )
      
      await this.node.sendMessage(this.policyAgentPeerId, message)
      console.log('Vote summary sent to policy agent')
    } else {
      console.log('Policy agent not discovered yet, cannot send vote summary')
    }
    
    return voteSummary
  }

  async stop() {
    await this.node.stop()
  }

  async interpretPrompt(prompt) {
    try {
      console.log(`Vote agent interpreting prompt: "${prompt}"`);
      
      const interpretation = await processPromptWithLLM(prompt);
      
      return {
        title: interpretation.title || 'Change request',
        changeType: interpretation.changeType || 'unknown',
        changeValue: interpretation.changeValue || '',
        description: prompt
      };
    } catch (error) {
      console.error('Error in vote agent interpretation:', error);
      
      return { 
        title: 'Change request',
        changeType: 'unknown',
        changeValue: '',
        description: prompt 
      };
    }
  }
}

export default VoteAgent 