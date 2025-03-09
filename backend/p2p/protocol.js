// Message types for agent communication
const MessageTypes = {
  VOTE_SUMMARY: 'vote_summary',
  POLICY_DECISION: 'policy_decision',
  CODE_CHANGE: 'code_change',
  CODE_APPLIED: 'code_applied',
  AGENT_INFO: 'agent_info'
}

// Create a message object with the appropriate structure
function createMessage(type, data, sender) {
  return {
    type,
    data,
    sender,
    timestamp: Date.now()
  }
}

// Validate incoming messages
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false
  }
  
  if (!message.type || !Object.values(MessageTypes).includes(message.type)) {
    return false
  }
  
  if (!message.data || !message.sender || !message.timestamp) {
    return false
  }
  
  return true
}

export { MessageTypes, createMessage, validateMessage } 