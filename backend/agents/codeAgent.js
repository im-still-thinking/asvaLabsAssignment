import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { ALLOWED_CHANGES } from '../services/policyEngine.js'

class CodeAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'code' })
    
    // Initialize settings based on allowed changes
    this.globalSettings = {
      primaryColor: '#3b82f6',
      fontFamily: 'Inter, sans-serif'
    }
    
    // Create settings map from allowed changes
    this.settingsMap = {
      'color': 'primaryColor',
      'font': 'fontFamily'
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
    
    const { changeType, changeValue } = message.data
    
    // Verify this is an allowed change type
    const allowedChange = ALLOWED_CHANGES.find(change => change.type === changeType)
    if (!allowedChange) {
      console.error('Attempted change type not allowed:', changeType)
      return { success: false, error: 'Change type not allowed' }
    }
    
    // Get the settings key for this change type
    const settingKey = this.settingsMap[changeType] || changeType
    
    // Update the setting
    this.globalSettings[settingKey] = changeValue
    
    // Broadcast settings update to all clients
    const settingsUpdateMessage = createMessage(
      MessageTypes.SETTINGS_UPDATE,
      this.globalSettings,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(settingsUpdateMessage)
    console.log('Settings update message broadcasted:', this.globalSettings)

    // Broadcast code applied message
    const codeAppliedMessage = createMessage(
      MessageTypes.CODE_APPLIED,
      {
        changeType,
        changeValue,
        success: true,
        settings: this.globalSettings
      },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(codeAppliedMessage)
    console.log('Code applied message broadcasted')
    
    return { success: true, settings: this.globalSettings }
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