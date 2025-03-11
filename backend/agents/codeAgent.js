import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { generateCode } from '../services/codeGenerator.js'

class CodeAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'code' })
    this.globalSettings = {
      primaryColor: '#3b82f6',
      fontFamily: 'Inter, sans-serif',
    }
  }

  async init() {
    await this.node.init()
    
    this.node.registerMessageHandler(MessageTypes.CODE_CHANGE, this.handleCodeChange.bind(this))
    
    setTimeout(() => {
      this.broadcastAgentInfo()
    }, 5000)
    
    return this
  }

  async handleCodeChange(message) {
    console.log('Received code change request:', message.data)
    
    const result = await generateCode(message.data)
    
    // Update in-memory settings regardless of code generation success
    // This ensures the UI updates even if file changes fail
    if (message.data.changeType === 'color') {
      this.globalSettings.primaryColor = message.data.changeValue
    } else if (message.data.changeType === 'font') {
      this.globalSettings.fontFamily = message.data.changeValue
    }
    
    // Broadcast settings update to all clients via a special message type
    const settingsUpdateMessage = createMessage(
      MessageTypes.SETTINGS_UPDATE,
      this.globalSettings,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(settingsUpdateMessage)
    console.log('Settings update message broadcasted')

    // Broadcast code applied message
    const codeAppliedMessage = createMessage(
      MessageTypes.CODE_APPLIED,
      {
        changeType: message.data.changeType,
        changeValue: message.data.changeValue,
        files: result.files,
        success: result.success,
        settings: this.globalSettings // Include settings in the code applied message
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