import { useApp } from '@/context/AppContext';
import { memo, useMemo, useState } from 'react';
import { MessageItem, PeerList } from './shared/VotingComponents';

// Main P2P info panel component
function P2PInfoPanel() {
  const { p2pInfo, isConnected } = useApp();
  const [expanded, setExpanded] = useState(false);
  
  // Memoize the peer ID display to avoid unnecessary re-renders
  const peerIdDisplay = useMemo(() => {
    if (!p2pInfo?.peerId) return 'Not connected';
    return expanded ? p2pInfo.peerId : `${p2pInfo.peerId.substring(0, 10)}...`;
  }, [p2pInfo?.peerId, expanded]);
  
  // Connection status indicator
  const connectionStatus = useMemo(() => {
    return (
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} mr-2`} 
           title={isConnected ? 'Connected' : 'Disconnected'} />
    );
  }, [isConnected]);

  return (
    <div className="bg-gray-800 text-white p-4 rounded-t-lg shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {connectionStatus}
          <h3 className="font-bold">P2P Network</h3>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="text-gray-300 hover:text-white transition-colors"
          aria-label={expanded ? 'Minimize panel' : 'Expand panel'}
        >
          {expanded ? 'Minimize' : 'Expand'}
        </button>
      </div>
      
      {expanded ? (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h4 className="text-sm font-semibold text-gray-400">Peer ID</h4>
            <p className="font-mono text-xs break-all">{peerIdDisplay}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-400">
              Connected Peers ({p2pInfo?.peers?.length || 0})
            </h4>
            <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
              <PeerList peers={p2pInfo?.peers || []} />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-400">
              Recent Messages ({p2pInfo?.messages?.length || 0})
            </h4>
            <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
              {p2pInfo?.messages?.length > 0 ? (
                <ul className="text-xs">
                  {p2pInfo.messages.map((msg, index) => (
                    <MessageItem key={msg.id || `${msg.timestamp}_${index}`} message={msg} />
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">No messages yet</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between text-xs">
          <span className="flex items-center">
            <span className="mr-1">ID:</span>
            <span className="font-mono">{peerIdDisplay}</span>
          </span>
          <span>Peers: {p2pInfo?.peers?.length || 0}</span>
          <span>Messages: {p2pInfo?.messages?.length || 0}</span>
        </div>
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export default memo(P2PInfoPanel); 