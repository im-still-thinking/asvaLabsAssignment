import { P2PNode, MessageTypes, createMessage } from '../p2p/index.js'
import { evaluateWithPolicyEngine } from '../services/policyEngine.js'

class PolicyAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'policy' })
    this.codeAgentPeerId = null
  }

  async init() {
    await this.node.init()
    
    // Register message handlers
    this.node.registerMessageHandler(MessageTypes.AGENT_INFO, this.handleAgentInfo.bind(this))
    this.node.registerMessageHandler(MessageTypes.VOTE_SUMMARY, this.handleVoteSummary.bind(this))
    this.node.registerMessageHandler(MessageTypes.CODE_APPLIED, this.handleCodeApplied.bind(this))
    
    // Broadcast agent info
    setTimeout(() => {
      this.broadcastAgentInfo()
    }, 5000)
    
    return this
  }

  async handleAgentInfo(message) {
    if (message.data.agentType === 'code') {
      this.codeAgentPeerId = message.sender
      console.log('Discovered code agent:', this.codeAgentPeerId)
    }
  }

  async handleVoteSummary(message) {
    console.log('Received vote summary:', message.data)
    
    // Evaluate the vote summary using the policy engine
    const decision = await evaluateWithPolicyEngine(message.data)
    
    // Broadcast the policy decision
    const policyMessage = createMessage(
      MessageTypes.POLICY_DECISION,
      decision,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(policyMessage)
    
    // If approved, send to code agent
    if (decision.approved && this.codeAgentPeerId) {
      const codeChangeRequest = createMessage(
        MessageTypes.CODE_CHANGE,
        {
          changeType: decision.changeType,
          changeValue: decision.changeValue,
          summary: decision.summary
        },
        this.node.node.peerId.toString()
      )
      
      await this.node.sendMessage(this.codeAgentPeerId, codeChangeRequest)
      console.log('Code change request sent to code agent')
    }
  }

  async handleCodeApplied(message) {
    console.log('Code changes applied:', message.data)
    // This agent doesn't need to do anything with code applied messages
  }

  async broadcastAgentInfo() {
    const message = createMessage(
      MessageTypes.AGENT_INFO,
      { agentType: 'policy' },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(message)
  }

  async stop() {
    await this.node.stop()
  }
}

export default PolicyAgent 