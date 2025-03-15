import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { evaluateWithPolicyEngine } from '../services/policyEngine.js'

class PolicyAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'policy' })
    this.codeAgentPeerId = null
  }

  async init() {
    await this.node.init()
    
    this.node.registerMessageHandler(MessageTypes.AGENT_INFO, this.handleAgentInfo.bind(this))
    this.node.registerMessageHandler(MessageTypes.VOTE_SUMMARY, this.handleVoteSummary.bind(this))
    this.node.registerMessageHandler(MessageTypes.CODE_APPLIED, this.handleCodeApplied.bind(this))
    
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
    
    const decision = await evaluateWithPolicyEngine(message.data)
    
    const policyMessage = createMessage(
      MessageTypes.POLICY_DECISION,
      decision,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(policyMessage)
    
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
    console.log('PolicyAgent: Code changes applied message received:', {
      changeType: message.data.changeType,
      changeValue: message.data.changeValue,
      success: message.data.success,
      sender: message.sender
    });
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