import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { evaluateWithPolicyEngine } from '../services/policyEngine.js'
import sessionService from '../services/sessionService.js'

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
    
    const voteSummary = message.data;
    const topicId = voteSummary.topicId;
    
    // Log the node interaction
    if (topicId) {
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.VOTE_SUMMARY,
        sender: message.sender,
        receiver: this.node.node.peerId.toString(),
        data: voteSummary
      });
    }
    
    const decision = await evaluateWithPolicyEngine(voteSummary)
    
    // Add topicId to the decision for tracking
    if (topicId) {
      decision.topicId = topicId;
      
      // Log the policy decision to the session
      await sessionService.addDecision(topicId, {
        type: 'policy_evaluation',
        value: decision,
        agent: 'policy'
      });
    }
    
    const policyMessage = createMessage(
      MessageTypes.POLICY_DECISION,
      decision,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(policyMessage)
    
    // Log the broadcast interaction
    if (topicId) {
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.POLICY_DECISION,
        sender: this.node.node.peerId.toString(),
        receiver: 'broadcast',
        data: decision
      });
    }
    
    if (decision.approved && this.codeAgentPeerId) {
      const codeChangeRequest = createMessage(
        MessageTypes.CODE_CHANGE,
        {
          changeType: decision.changeType,
          changeValue: decision.changeValue,
          summary: decision.summary,
          topicId: topicId // Pass the topicId to the code agent
        },
        this.node.node.peerId.toString()
      )
      
      await this.node.sendMessage(this.codeAgentPeerId, codeChangeRequest)
      console.log('Code change request sent to code agent')
      
      // Log the code change request interaction
      if (topicId) {
        await sessionService.addNodeInteraction(topicId, {
          type: MessageTypes.CODE_CHANGE,
          sender: this.node.node.peerId.toString(),
          receiver: this.codeAgentPeerId,
          data: {
            changeType: decision.changeType,
            changeValue: decision.changeValue,
            summary: decision.summary
          }
        });
      }
    }
  }

  async handleCodeApplied(message) {
    console.log('Code changes applied:', message.data)
    
    // Log the code applied interaction if it contains a topicId
    if (message.data.topicId) {
      const topicId = message.data.topicId;
      
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.CODE_APPLIED,
        sender: message.sender,
        receiver: this.node.node.peerId.toString(),
        data: message.data
      });
      
      // Update the session status to completed if this is the final step
      await sessionService.updateSessionStatus(topicId, 'approved', new Date());
    }
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