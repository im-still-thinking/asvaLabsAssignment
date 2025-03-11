import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

// Import shared components from VotingCard
import {
    ProgressBar,
    SplitVoteBar,
    StatusMessage
} from './shared/VotingComponents';

interface VotingSectionProps {
  topic: Topic;
}

function VotingSection({ topic }: VotingSectionProps) {
  const { castVote, currentUser, votingConfig } = useApp();
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [maxTimePercentage, setMaxTimePercentage] = useState<number>(100);

  // Memoize existing vote check
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

  // Memoize vote counts and calculations
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

  // Memoize time display
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
    <div className="space-y-6">
      {/* Voting progress */}
      {topic.status === 'active' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Voting Progress</h3>
          
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
      
      {/* Current votes */}
      <div>
        <h3 className="text-lg font-medium mb-3">Current Votes</h3>
        
        <div className="flex items-center mb-4">
          <div className="w-20 text-center">
            <div className="text-2xl font-bold">{voteStats.yesVotes}</div>
            <div className="text-sm text-gray-500">Yes</div>
          </div>
          
          <div className="flex-1 mx-4">
            <SplitVoteBar 
              yesVotes={voteStats.yesVotes} 
              noVotes={voteStats.noVotes}
              height="h-4" 
            />
          </div>
          
          <div className="w-20 text-center">
            <div className="text-2xl font-bold">{voteStats.noVotes}</div>
            <div className="text-sm text-gray-500">No</div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          {voteStats.totalVotes} total votes
        </div>
      </div>
      
      {/* Cast vote */}
      {topic.status === 'active' && currentUser && (
        <div>
          <h3 className="text-lg font-medium mb-3">Cast Your Vote</h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleVote('yes')}
              className={`flex-1 py-3 rounded-md font-medium transition-colors ${
                existingVote?.vote === 'yes' || userVote === 'yes'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              disabled={!!existingVote}
              aria-label="Vote Yes"
            >
              Vote Yes
            </button>
            
            <button
              onClick={() => handleVote('no')}
              className={`flex-1 py-3 rounded-md font-medium transition-colors ${
                existingVote?.vote === 'no' || userVote === 'no'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              disabled={!!existingVote}
              aria-label="Vote No"
            >
              Vote No
            </button>
          </div>
          
          {(existingVote || userVote) && (
            <div className="mt-2 text-center text-sm text-gray-500">
              You voted: {existingVote?.vote || userVote}
            </div>
          )}
        </div>
      )}
      
      {/* Status messages */}
      <div className="mt-4">
        <StatusMessage status={topic.status} variant="section" />
      </div>
    </div>
  );
}

export default memo(VotingSection); 