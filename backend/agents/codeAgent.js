import { P2PNode, MessageTypes, createMessage } from '../p2p/index.js'
import { generateCode } from '../services/codeGenerator.js'

class CodeAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'code' })
  }

  async init() {
    await this.node.init()
    
    // Register message handlers
    this.node.registerMessageHandler(MessageTypes.CODE_CHANGE, this.handleCodeChange.bind(this))
    
    // Broadcast agent info
    setTimeout(() => {
      this.broadcastAgentInfo()
    }, 5000)
    
    return this
  }

  async handleCodeChange(message) {
    console.log('Received code change request:', message.data)
    
    // Generate and apply code changes
    const result = await generateCode(message.data)
    
    // Broadcast that code has been applied
    const codeAppliedMessage = createMessage(
      MessageTypes.CODE_APPLIED,
      {
        changeType: message.data.changeType,
        changeValue: message.data.changeValue,
        files: result.files,
        success: result.success
      },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(codeAppliedMessage)
    console.log('Code applied message broadcasted')
    
    return result
  }

  async broadcastAgentInfo() {
    const message = createMessage(
      MessageTypes.AGENT_INFO,
      { agentType: 'code' },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(message)
  }

  async stop() {
    await this.node.stop()
  }
}

export default CodeAgent 