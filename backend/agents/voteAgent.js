import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { processPromptWithLLM, processVotesWithLLM } from '../services/llmService.js'
import { ALLOWED_CHANGES } from '../services/policyEngine.js'
import sessionService from '../services/sessionService.js'

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
    
    // Log the policy decision to the session if it contains a topicId
    if (message.data.voteSummary && message.data.voteSummary.topicId) {
      const topicId = message.data.voteSummary.topicId;
      
      // Add the decision to the session
      await sessionService.addDecision(topicId, {
        type: 'policy_decision',
        value: message.data,
        agent: 'policy'
      });
      
      // If this is a final decision, update the session with the final decision
      if (message.data.approved !== undefined) {
        await sessionService.setFinalDecision(topicId, {
          approved: message.data.approved,
          justification: message.data.justification,
          summary: message.data.summary
        });
      }
    }
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
    
    // Add topicId to the vote summary for tracking
    if (votingData.topicId) {
      voteSummary.topicId = votingData.topicId;
      
      // Log the vote summary to the session
      await sessionService.addDecision(votingData.topicId, {
        type: 'vote_summary',
        value: voteSummary,
        agent: 'vote'
      });
      
      // Log all votes to the session
      if (votingData.votes && votingData.votes.length > 0) {
        for (const vote of votingData.votes) {
          await sessionService.addVote(votingData.topicId, vote);
        }
      }
    }
    
    if (this.policyAgentPeerId) {
      const message = createMessage(
        MessageTypes.VOTE_SUMMARY,
        voteSummary,
        this.node.node.peerId.toString()
      )
      
      await this.node.sendMessage(this.policyAgentPeerId, message)
      console.log('Vote summary sent to policy agent')
      
      // Log the node interaction
      if (votingData.topicId) {
        await sessionService.addNodeInteraction(votingData.topicId, {
          type: MessageTypes.VOTE_SUMMARY,
          sender: this.node.node.peerId.toString(),
          receiver: this.policyAgentPeerId,
          data: voteSummary
        });
      }
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
      console.log(`Vote agent interpreting prompt: "${prompt}"`)
      
      const interpretation = await processPromptWithLLM(prompt)
      
      // Check if the interpreted change type is in the allowed changes list
      const isAllowedChange = ALLOWED_CHANGES.some(change => change.type === interpretation.changeType)
      
      if (!isAllowedChange) {
        throw new Error(`Change type "${interpretation.changeType}" is not allowed. Only the following changes are supported: ${ALLOWED_CHANGES.map(c => c.type).join(', ')}`)
      }
      
      // Find the allowed change to get its validation rules
      const allowedChange = ALLOWED_CHANGES.find(change => change.type === interpretation.changeType)
      
      // Basic validation based on change type
      if (interpretation.changeType === 'color') {
        const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(interpretation.changeValue)
        if (!isValidHex) {
          throw new Error(`Invalid color format. ${allowedChange.validation}`)
        }
      } else if (interpretation.changeType === 'font') {
        if (!interpretation.changeValue.trim()) {
          throw new Error(`Invalid font value. ${allowedChange.validation}`)
        }
        // Add fallback for font if not specified
        if (!interpretation.changeValue.includes(',')) {
          interpretation.changeValue = `${interpretation.changeValue}, sans-serif`
        }
      }
      
      // Create a more descriptive title using the interpretation
      const title = interpretation.interpretation 
        ? `${interpretation.title} (${interpretation.interpretation})`
        : interpretation.title

      const result = {
        title: title,
        changeType: interpretation.changeType,
        changeValue: interpretation.changeValue,
        description: `${prompt}\n\nInterpreted as: ${interpretation.interpretation || 'Direct change'}`
      };
      
      // Store the interpretation in the metadata for later use when creating a session
      result.interpretation = interpretation;
      
      return result;
    } catch (error) {
      console.error('Error in vote agent interpretation:', error)
      throw error // Propagate the error to be handled by the API
    }
  }
}

export default VoteAgent 