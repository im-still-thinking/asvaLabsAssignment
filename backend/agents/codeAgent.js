import { MessageTypes, P2PNode, createMessage } from '../p2p/index.js'
import { ALLOWED_CHANGES } from '../services/policyEngine.js'
import sessionService from '../services/sessionService.js'

class CodeAgent {
  constructor() {
    this.node = new P2PNode({ agentType: 'code' })
    
    this.globalSettings = {
      primaryColor: '#3b82f6',
      fontFamily: 'Inter, sans-serif'
    }
    
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
    
    const { changeType, changeValue, topicId } = message.data
    
    // Log the node interaction
    if (topicId) {
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.CODE_CHANGE,
        sender: message.sender,
        receiver: this.node.node.peerId.toString(),
        data: message.data
      });
      
      // Add the code change decision to the session
      await sessionService.addDecision(topicId, {
        type: 'code_change',
        value: message.data,
        agent: 'code'
      });
    }
    
    // Verify this is an allowed change type
    const allowedChange = ALLOWED_CHANGES.find(change => change.type === changeType)
    if (!allowedChange) {
      console.error('Attempted change type not allowed:', changeType)
      
      // Log the error to the session if topicId is provided
      if (topicId) {
        await sessionService.addDecision(topicId, {
          type: 'code_change_error',
          value: { error: 'Change type not allowed', changeType },
          agent: 'code'
        });
      }
      
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
    
    // Log the settings update interaction
    if (topicId) {
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.SETTINGS_UPDATE,
        sender: this.node.node.peerId.toString(),
        receiver: 'broadcast',
        data: this.globalSettings
      });
    }

    // Broadcast code applied message
    const codeAppliedMessage = createMessage(
      MessageTypes.CODE_APPLIED,
      {
        changeType,
        changeValue,
        success: true,
        settings: this.globalSettings,
        topicId // Include the topicId in the response
      },
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(codeAppliedMessage)
    console.log('Code applied message broadcasted')
    
    // Log the code applied interaction
    if (topicId) {
      await sessionService.addNodeInteraction(topicId, {
        type: MessageTypes.CODE_APPLIED,
        sender: this.node.node.peerId.toString(),
        receiver: 'broadcast',
        data: {
          changeType,
          changeValue,
          success: true,
          settings: this.globalSettings
        }
      });
      
      // Add the final code applied decision to the session
      await sessionService.addDecision(topicId, {
        type: 'code_applied',
        value: {
          changeType,
          changeValue,
          success: true,
          settings: this.globalSettings
        },
        agent: 'code'
      });
    }
    
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