import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';

interface VotingSectionProps {
  topic: Topic;
}

export default function VotingSection({ topic }: VotingSectionProps) {
  const { castVote, currentUser } = useApp();
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [minutesRemaining, setMinutesRemaining] = useState<number>(0);
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
      setMinutesRemaining(Math.floor(remaining / (1000 * 60)));
      setSecondsRemaining(Math.floor((remaining % (1000 * 60)) / 1000));
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

  return (
    <div className="card">
      <h3 className="text-xl font-medium mb-2">{topic.title}</h3>
      <p className="text-gray-600 mb-4">{topic.description}</p>
      
      <div className="mb-4">
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
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Time remaining:</span>
          <span>
            {minutesRemaining}m {secondsRemaining}s
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${(timeRemaining / (30 * 1000)) * 100}%`, // 30 seconds
            }}
          ></div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Current votes:</span>
          <span>
            {yesVotes} Yes / {noVotes} No ({totalVotes} total)
          </span>
        </div>
        {totalVotes > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 flex">
            <div
              className="bg-green-500 h-2.5 rounded-l-full"
              style={{
                width: `${(yesVotes / totalVotes) * 100}%`,
              }}
            ></div>
            <div
              className="bg-red-500 h-2.5 rounded-r-full"
              style={{
                width: `${(noVotes / totalVotes) * 100}%`,
              }}
            ></div>
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={() => handleVote('yes')}
          className={`flex-1 btn ${
            existingVote?.vote === 'yes' || userVote === 'yes'
              ? 'bg-green-500 text-white'
              : 'btn-secondary'
          }`}
          disabled={timeRemaining === 0}
        >
          Vote Yes
        </button>
        <button
          onClick={() => handleVote('no')}
          className={`flex-1 btn ${
            existingVote?.vote === 'no' || userVote === 'no'
              ? 'bg-red-500 text-white'
              : 'btn-secondary'
          }`}
          disabled={timeRemaining === 0}
        >
          Vote No
        </button>
      </div>
      
      {(existingVote || userVote) && (
        <div className="mt-4 text-center text-sm text-gray-500">
          You voted: {existingVote?.vote || userVote}
        </div>
      )}
      
      {timeRemaining === 0 && (
        <div className="mt-4 text-center text-sm font-medium text-blue-600">
          Voting has ended. Processing results...
        </div>
      )}
    </div>
  );
} 