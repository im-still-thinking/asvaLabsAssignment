import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';

interface VotingCardProps {
  topic: Topic;
}

export default function VotingCard({ topic }: VotingCardProps) {
  const { castVote, currentUser } = useApp();
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Check if user has already voted
  const existingVote = topic.votes.find(
    (v) => v.userId === currentUser?.id
  );

  // Update timer every second
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(topic.endTime);
      const remaining = Math.max(0, endTime.getTime() - now.getTime());
      
      setTimeRemaining(remaining);
      setSecondsRemaining(Math.floor(remaining / 1000));
    };
    
    // Update immediately
    updateTimer();
    
    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [topic.endTime]);

  // Calculate vote counts
  const yesVotes = topic.votes.filter((v) => v.vote === 'yes').length;
  const noVotes = topic.votes.filter((v) => v.vote === 'no').length;
  const totalVotes = topic.votes.length;

  const handleVote = (vote: 'yes' | 'no') => {
    castVote(topic.id, vote);
    setUserVote(vote);
  };

  // Format the creation date
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  // Get status badge color and text
  const getStatusBadge = () => {
    switch (topic.status) {
      case 'active':
        return { color: 'bg-blue-100 text-blue-800', text: 'Active' };
      case 'processing':
        return { color: 'bg-yellow-100 text-yellow-800', text: 'Processing' };
      case 'approved':
        return { color: 'bg-green-100 text-green-800', text: 'Approved' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', text: 'Rejected' };
      case 'error':
        return { color: 'bg-gray-100 text-gray-800', text: 'Error' };
      default:
        return { color: 'bg-gray-100 text-gray-800', text: topic.status };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{topic.title}</h3>
            <p className="text-sm text-gray-500">
              Proposed by @user{topic.createdBy} • {formatDate(topic.createdAt)}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4">
        <p className="text-gray-700 mb-4">{topic.description}</p>
        
        {/* Change preview */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium">
            Change {topic.changeType} to: {topic.changeValue}
          </span>
          {topic.changeType === 'color' && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">Preview:</span>
              <div
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: topic.changeValue }}
              ></div>
            </div>
          )}
        </div>
        
        {/* Timer */}
        {topic.status === 'active' && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Time remaining:</span>
              <span>{secondsRemaining}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(timeRemaining / (30 * 1000)) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Vote counts */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Current votes:</span>
            <span>
              {yesVotes} Yes / {noVotes} No ({totalVotes} total)
            </span>
          </div>
          {totalVotes > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 flex">
              <div
                className="bg-green-500 h-2 rounded-l-full"
                style={{
                  width: `${(yesVotes / totalVotes) * 100}%`,
                }}
              ></div>
              <div
                className="bg-red-500 h-2 rounded-r-full"
                style={{
                  width: `${(noVotes / totalVotes) * 100}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t">
        {topic.status === 'active' && currentUser && (
          <div className="flex gap-2">
            <button
              onClick={() => handleVote('yes')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                existingVote?.vote === 'yes' || userVote === 'yes'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={timeRemaining === 0}
            >
              Vote Yes
            </button>
            <button
              onClick={() => handleVote('no')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                existingVote?.vote === 'no' || userVote === 'no'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={timeRemaining === 0}
            >
              Vote No
            </button>
          </div>
        )}
        
        {(existingVote || userVote) && topic.status === 'active' && (
          <div className="mt-2 text-center text-sm text-gray-500">
            You voted: {existingVote?.vote || userVote}
          </div>
        )}
        
        {timeRemaining === 0 && topic.status === 'active' && (
          <div className="text-center text-sm font-medium text-blue-600">
            Voting has ended. Processing results...
          </div>
        )}
        
        {topic.status === 'approved' && (
          <div className="text-center text-sm font-medium text-green-600">
            This change has been approved and applied!
          </div>
        )}
        
        {topic.status === 'rejected' && (
          <div className="text-center text-sm font-medium text-red-600">
            This change was rejected by the policy engine.
          </div>
        )}
        
        {topic.status === 'error' && (
          <div className="text-center text-sm font-medium text-gray-600">
            There was an error processing this topic.
          </div>
        )}
      </div>
    </div>
  );
} 