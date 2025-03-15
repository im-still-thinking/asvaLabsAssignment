import { memo, useMemo } from 'react';

// Reusable progress bar component
export const ProgressBar = memo(({ 
  value, 
  maxValue, 
  colorClass = 'bg-blue-600',
  height = 'h-2',
  showThreshold = false,
  thresholdValue = 0
}: { 
  value: number; 
  maxValue: number;
  colorClass?: string;
  height?: string;
  showThreshold?: boolean;
  thresholdValue?: number;
}) => {
  const percentage = Math.min(100, (value / maxValue) * 100);
  
  return (
    <div className="relative">
      <div className={`w-full bg-gray-200 rounded-full ${height}`}>
        <div
          className={`${colorClass} ${height} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showThreshold && (
        <div className="w-full relative h-1">
          <div 
            className="absolute top-0 h-3 border-l-2 border-gray-500" 
            style={{ left: `${thresholdValue}%` }}
          />
        </div>
      )}
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

// Split vote progress bar component
export const SplitVoteBar = memo(({ 
  yesVotes, 
  noVotes,
  height = 'h-2'
}: { 
  yesVotes: number; 
  noVotes: number;
  height?: string;
}) => {
  const totalVotes = yesVotes + noVotes;
  const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;
  
  if (totalVotes === 0) return null;
  
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} flex`}>
      <div
        className="bg-green-500 h-full rounded-l-full"
        style={{ width: `${yesPercentage}%` }}
      />
      <div
        className="bg-red-500 h-full rounded-r-full"
        style={{ width: `${noPercentage}%` }}
      />
    </div>
  );
});

SplitVoteBar.displayName = 'SplitVoteBar';

// Status badge component
export const StatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'active':
        return { color: 'bg-blue-100 text-blue-800', text: 'Active' };
      case 'processing':
        return { color: 'bg-yellow-100 text-yellow-800', text: 'Processing' };
      case 'applying':
        return { color: 'bg-purple-100 text-purple-800', text: 'Applying' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', text: 'Completed' };
      case 'approved':
        return { color: 'bg-green-100 text-green-800', text: 'Approved' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', text: 'Rejected' };
      case 'error':
        return { color: 'bg-gray-100 text-gray-800', text: 'Error' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: status };
    }
  }, [status]);
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.color}`}>
      {statusConfig.text}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Color preview component
export const ColorPreview = memo(({ color }: { color: string }) => (
  <div className="mt-1 flex items-center gap-2">
    <span className="text-xs text-gray-500">Preview:</span>
    <div
      className="w-4 h-4 rounded-full border border-gray-300"
      style={{ backgroundColor: color }}
    />
  </div>
));

ColorPreview.displayName = 'ColorPreview';

// Status message component
export const StatusMessage = memo(({ status, variant = 'card' }: { status: string, variant?: 'card' | 'section' }) => {
  if (status === 'processing') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-blue-600">
        Processing results...
      </div>
    ) : (
      <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-center">
        Processing results...
      </div>
    );
  }
  
  if (status === 'applying') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-purple-600">
        Change approved! Applying code changes...
      </div>
    ) : (
      <div className="p-3 bg-purple-50 text-purple-700 rounded-md text-center">
        Change approved! Applying code changes...
      </div>
    );
  }
  
  if (status === 'completed') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-green-600">
        This change has been successfully applied!
      </div>
    ) : (
      <div className="p-3 bg-green-50 text-green-700 rounded-md text-center">
        This change has been successfully applied!
      </div>
    );
  }
  
  if (status === 'approved') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-green-600">
        This change has been approved and applied!
      </div>
    ) : (
      <div className="p-3 bg-green-50 text-green-700 rounded-md text-center">
        This change has been approved and applied!
      </div>
    );
  }
  
  if (status === 'rejected') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-red-600">
        This change was rejected. Not enough votes in favor.
      </div>
    ) : (
      <div className="p-3 bg-red-50 text-red-700 rounded-md text-center">
        This change was rejected. Not enough votes in favor.
      </div>
    );
  }
  
  if (status === 'error') {
    return variant === 'card' ? (
      <div className="text-center text-sm font-medium text-gray-600">
        There was an error processing this topic.
      </div>
    ) : (
      <div className="p-3 bg-gray-50 text-gray-700 rounded-md text-center">
        There was an error processing this topic.
      </div>
    );
  }
  
  return null;
});

StatusMessage.displayName = 'StatusMessage';

// Message item component for P2P messages
export const MessageItem = memo(({ message }: { message: any }) => {
  const time = new Date(message.timestamp).toLocaleTimeString();
  
  // Extract message type and agent from content
  const agentMatch = message.content.match(/^([^:]+):/);
  const agent = agentMatch ? agentMatch[1] : '';
  
  // Format message content for better readability
  const formattedContent = message.content
    .replace(/^[^:]+:\s*/, '') // Remove agent prefix
    .replace(/\s*-\s*\{.*\}\.\.\./, ''); // Remove JSON snippet
  
  return (
    <li className="py-1 border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
      <span className="text-gray-400">[{time}]</span>{' '}
      <span className="font-semibold text-blue-300">{message.type}</span>{' '}
      {agent && <span className="text-green-300">{agent}:</span>}{' '}
      <span className="font-mono">{formattedContent}</span>
    </li>
  );
});

MessageItem.displayName = 'MessageItem';

// Peer list component
export const PeerList = memo(({ peers }: { peers: string[] }) => {
  if (peers.length === 0) {
    return <p className="text-xs text-gray-400">No peers connected</p>;
  }
  
  return (
    <ul className="text-xs">
      {peers.map((peer, index) => (
        <li key={index} className="font-mono py-1 border-b border-gray-700 truncate hover:text-clip">
          {peer}
        </li>
      ))}
    </ul>
  );
});

PeerList.displayName = 'PeerList'; 