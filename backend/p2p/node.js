import { bootstrap } from '@libp2p/bootstrap'
import { kadDHT } from '@libp2p/kad-dht'
import { mdns } from '@libp2p/mdns'
import { mplex } from '@libp2p/mplex'
import { noise } from '@libp2p/noise'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { createLibp2p } from 'libp2p'

class P2PNode {
  constructor(options = {}) {
    this.peerId = options.peerId
    this.agentType = options.agentType || 'generic'
    this.messageHandlers = new Map()
    this.wildcardHandlers = []
    this.node = null
  }

  async init() {
    try {
      this.node = await createLibp2p({
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        },
        transports: [
          tcp(),
          webSockets()
        ],
        connectionEncryption: [
          noise()
        ],
        streamMuxers: [
          mplex()
        ],
        peerDiscovery: [
          mdns({
            interval: 20000
          }),
          bootstrap({
            list: [
              // Add bootstrap nodes if needed
              '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
            ]
          })
        ],
        dht: kadDHT()
      })

      this.node.addEventListener('peer:discovery', (evt) => {
        console.log(`Discovered peer: ${evt.detail.id.toString()}`)
      })

      this.node.addEventListener('peer:connect', (evt) => {
        try {
          if (evt.detail && typeof evt.detail.toString === 'function') {
            console.log(`Connected to peer: ${evt.detail.toString()}`);
          } else {
            console.log('Connected to peer (ID not available)');
          }
        } catch (error) {
          console.error('Error in peer:connect handler:', error);
          console.log('Connected to peer: unknown');
        }
      });

      await this.node.handle('/agent/1.0.0', async ({ stream, connection }) => {
        const decoder = new TextDecoder()
        let message = ''

        try {
          for await (const chunk of stream.source) {
            message += decoder.decode(chunk.subarray())
          }

          const parsedMessage = JSON.parse(message)
          console.log(`Received message from ${connection.remotePeer.toString()}:`, parsedMessage)
          
          for (const handler of this.wildcardHandlers) {
            await handler(parsedMessage, connection.remotePeer)
          }
          
          if (this.messageHandlers.has(parsedMessage.type)) {
            const handler = this.messageHandlers.get(parsedMessage.type)
            await handler(parsedMessage, connection.remotePeer)
          } else {
            console.log(`No specific handler for message type: ${parsedMessage.type}`)
          }
        } catch (err) {
          console.error('Error handling message:', err)
        }
      })

      console.log(`P2P node started with ID: ${this.node.peerId.toString()}`)
      console.log(`Agent type: ${this.agentType}`)
      
      return this.node
    } catch (error) {
      console.error('Failed to start P2P node:', error)
      throw error
    }
  }

  async sendMessage(peerId, message) {
    try {
      let peerIdObj = peerId;
      if (typeof peerId === 'string') {
        const { peerIdFromString } = await import('@libp2p/peer-id');
        peerIdObj = peerIdFromString(peerId);
      }
      
      const connection = await this.node.dial(peerIdObj);
      const stream = await connection.newStream('/agent/1.0.0');
      
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      
      await stream.sink([data]);
      console.log(`Message sent to ${typeof peerId === 'string' ? peerId : peerId.toString()}`);
    } catch (error) {
      console.error(`Failed to send message to ${typeof peerId === 'string' ? peerId : peerId.toString()}:`, error);
      throw error;
    }
  }

  registerMessageHandler(type, handler) {
    if (type === '*') {
      this.wildcardHandlers.push(handler)
    } else {
      this.messageHandlers.set(type, handler)
    }
  }

  async broadcastMessage(message) {
    const peers = this.node.getPeers()
    const promises = []
    
    for (const peer of peers) {
      promises.push(this.sendMessage(peer, message))
    }
    
    await Promise.allSettled(promises)
    
    for (const handler of this.wildcardHandlers) {
      await handler(message, this.node.peerId)
    }
  }

  async stop() {
    if (this.node) {
      await this.node.stop()
      console.log('P2P node stopped')
    }
  }
}

export default P2PNode 