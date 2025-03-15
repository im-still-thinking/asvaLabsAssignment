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
    
    try {
      const result = await generateCode(message.data)
      console.log('Code generation result:', result)
      
      if (result.settingsUpdates && Object.keys(result.settingsUpdates).length > 0) {
        Object.assign(this.globalSettings, result.settingsUpdates)
        console.log('Updated global settings based on LLM recommendations:', this.globalSettings)
      } else {
        console.log('No settings updates were provided by the LLM')
      }
      
      await this.broadcastSettingsUpdate()
      
      await this.broadcastCodeApplied(message.data, result)
      
      return result
    } catch (error) {
      console.error('Error handling code change:', error)
      
      const errorMessage = createMessage(
        MessageTypes.CODE_ERROR,
        {
          changeType: message.data.changeType,
          changeValue: message.data.changeValue,
          error: error.message
        },
        this.node.node.peerId.toString()
      )
      
      await this.node.broadcastMessage(errorMessage)
      
      throw error
    }
  }
  

  async broadcastSettingsUpdate() {
    const settingsUpdateMessage = createMessage(
      MessageTypes.SETTINGS_UPDATE,
      this.globalSettings,
      this.node.node.peerId.toString()
    )
    
    await this.node.broadcastMessage(settingsUpdateMessage)
    console.log('Settings update message broadcasted')
  }
  

  async broadcastCodeApplied(changeRequest, result) {
    console.log('Broadcasting code applied message with data:', {
      changeType: changeRequest.changeType,
      changeValue: changeRequest.changeValue,
      success: result.success
    });
    
    const messageData = {
      changeType: changeRequest.changeType,
      changeValue: changeRequest.changeValue,
      files: result.files,
      success: result.success,
      settings: this.globalSettings,
      explanation: result.explanation
    };
    
    const codeAppliedMessage = createMessage(
      MessageTypes.CODE_APPLIED,
      messageData,
      this.node.node.peerId.toString()
    );
    
    await this.node.broadcastMessage(codeAppliedMessage);
    console.log('Code applied message broadcasted');
    

    if (typeof global.updateTopicStatusFromCodeApplied === 'function') {
      try {
        global.updateTopicStatusFromCodeApplied(messageData);
      } catch (error) {
        console.error('Error directly updating topic status:', error);
      }
    }
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