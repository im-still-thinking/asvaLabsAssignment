import { useApp } from '@/context/AppContext';
import { Topic } from '@/types';
import { memo, useMemo } from 'react';
import { StatusBadge } from './shared/VotingComponents';

// Memoized topic item component
const TopicItem = memo(({ topic }: { topic: Topic }) => {
  const { settings } = useApp();
  
  // Calculate time remaining or status text
  const statusText = useMemo(() => {
    if (topic.status !== 'active') {
      return topic.status.charAt(0).toUpperCase() + topic.status.slice(1);
    }
    
    const now = new Date();
    const endTime = new Date(topic.endTime);
    const timeRemaining = endTime.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      return 'Ended';
    }
    
    const secondsRemaining = Math.floor(timeRemaining / 1000);
    return `${secondsRemaining}s left`;
  }, [topic.status, topic.endTime]);

  // Memoize status color
  const statusColor = useMemo(() => {
    return topic.status === 'approved' ? 'green' : 
           topic.status === 'rejected' ? 'red' : 
           settings.primaryColor;
  }, [topic.status, settings.primaryColor]);

  return (
    <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer">
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-sm truncate flex-1" style={{ color: settings.primaryColor }}>
          {topic.title}
        </h3>
        <div className="ml-2">
          <StatusBadge status={topic.status} />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1 truncate">
        {topic.description}
      </p>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs font-medium" style={{ color: statusColor }}>
          {statusText}
        </span>
        <span className="text-xs text-gray-500">
          {topic.votes.length} votes
        </span>
      </div>
    </div>
  );
});

TopicItem.displayName = 'TopicItem';

function TopicsList() {
  const { topics } = useApp();

  // Memoize sorted topics to prevent unnecessary re-sorting
  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [topics]);

  // Memoize the empty state message
  const emptyState = useMemo(() => (
    <p className="text-sm text-gray-500 p-4 text-center bg-gray-50 rounded-md">
      No topics available. Create a new topic to get started!
    </p>
  ), []);

  return (
    <div className="space-y-3">
      {sortedTopics.length === 0 ? emptyState : (
        sortedTopics.map(topic => (
          <TopicItem key={topic.id} topic={topic} />
        ))
      )}
    </div>
  );
}

export default memo(TopicsList); 