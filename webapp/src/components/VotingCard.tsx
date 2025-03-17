import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ColorPreview,
    ProgressBar,
    SplitVoteBar,
    StatusBadge,
    StatusMessage
} from './shared/VotingComponents';

interface VotingCardProps {
  topic: Topic;
}

function VotingCard({ topic }: VotingCardProps) {
  const { castVote, currentUser, votingConfig } = useApp();
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [maxTimePercentage, setMaxTimePercentage] = useState<number>(100);

  const existingVote = useMemo(() => 
    topic.votes.find(v => v.userId === currentUser?.id),
    [topic.votes, currentUser?.id]
  );

  // Update elapsed time every second (for the fallback timer)
  useEffect(() => {
    if (topic.status !== 'active') return;
    
    const updateTimer = () => {
      const now = new Date();
      const createdAt = new Date(topic.createdAt);
      const elapsed = now.getTime() - createdAt.getTime();
      const percentage = Math.min(100, (elapsed / votingConfig.MAX_VOTING_TIME) * 100);
      
      setElapsedTime(elapsed);
      setMaxTimePercentage(percentage);
    };
    
    // Update immediately
    updateTimer();
    
    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [topic.createdAt, topic.status, votingConfig.MAX_VOTING_TIME]);

  const voteStats = useMemo(() => {
    const yesVotes = topic.votes.filter((v) => v.vote === 'yes').length;
    const noVotes = topic.votes.filter((v) => v.vote === 'no').length;
    const totalVotes = topic.votes.length;
    const votesProgress = Math.min(100, (totalVotes / votingConfig.MIN_VOTES_THRESHOLD) * 100);
    const yesPercentage = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
    const approvalStatus = yesPercentage >= votingConfig.APPROVAL_PERCENTAGE ? 'passing' : 'failing';
    
    return {
      yesVotes,
      noVotes,
      totalVotes,
      votesProgress,
      yesPercentage,
      approvalStatus
    };
  }, [topic.votes, votingConfig.MIN_VOTES_THRESHOLD, votingConfig.APPROVAL_PERCENTAGE]);

  const formattedDate = useMemo(() => {
    const d = new Date(topic.createdAt);
    return d.toLocaleString();
  }, [topic.createdAt]);

  const timeDisplay = useMemo(() => {
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [elapsedTime]);

  // Use callback for vote handler
  const handleVote = useCallback((vote: 'yes' | 'no') => {
    castVote(topic.id, vote);
    setUserVote(vote);
  }, [castVote, topic.id]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{topic.title}</h3>
            <p className="text-sm text-gray-500">
              Proposed by @user{topic.createdBy} • {formattedDate}
            </p>
          </div>
          <StatusBadge status={topic.status} />
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
          {topic.changeType === 'color' && <ColorPreview color={topic.changeValue} />}
        </div>
        
        {/* Voting Progress */}
        {topic.status === 'active' && (
          <div className="mb-4 space-y-3">
            {/* Votes count progress */}
            <div>
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Votes collected:</span>
                <span>{voteStats.totalVotes} / {votingConfig.MIN_VOTES_THRESHOLD} minimum</span>
              </div>
              <ProgressBar 
                value={voteStats.totalVotes} 
                maxValue={votingConfig.MIN_VOTES_THRESHOLD} 
              />
            </div>
            
            {/* Approval threshold progress */}
            <div>
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Approval status:</span>
                <span className={voteStats.approvalStatus === 'passing' ? 'text-green-600' : 'text-red-600'}>
                  {voteStats.approvalStatus === 'passing' ? 'Passing' : 'Failing'} 
                  ({voteStats.yesPercentage.toFixed(0)}% yes, {votingConfig.APPROVAL_PERCENTAGE}% needed)
                </span>
              </div>
              <SplitVoteBar 
                yesVotes={voteStats.yesVotes} 
                noVotes={voteStats.noVotes} 
              />
              <div className="w-full relative h-1">
                <div 
                  className="absolute top-0 h-3 border-l-2 border-gray-500" 
                  style={{ left: `${votingConfig.APPROVAL_PERCENTAGE}%` }}
                />
              </div>
            </div>
            
            {/* Fallback timer */}
            <div>
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Time elapsed:</span>
                <span>{timeDisplay}</span>
              </div>
              <ProgressBar 
                value={maxTimePercentage} 
                maxValue={100} 
                colorClass="bg-gray-400" 
                height="h-1" 
              />
              <p className="text-xs text-gray-400 mt-1">
                Auto-processing after {Math.floor(votingConfig.MAX_VOTING_TIME / 60000)} minutes of inactivity
              </p>
            </div>
          </div>
        )}
        
        {/* Vote counts */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Current votes:</span>
            <span>
              {voteStats.yesVotes} Yes / {voteStats.noVotes} No ({voteStats.totalVotes} total)
            </span>
          </div>
          <SplitVoteBar 
            yesVotes={voteStats.yesVotes} 
            noVotes={voteStats.noVotes} 
          />
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
              disabled={!!existingVote}
              aria-label="Vote Yes"
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
              disabled={!!existingVote}
              aria-label="Vote No"
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
        
        <StatusMessage status={topic.status} variant="card" />
      </div>
    </div>
  );
}

export default memo(VotingCard); 