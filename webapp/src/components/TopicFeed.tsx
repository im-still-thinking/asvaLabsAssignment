import { useApp } from '@/context/AppContext';
import VotingCard from './VotingCard';

export default function TopicFeed() {
  const { topics, currentUser } = useApp();

  // Sort topics by creation date (newest first)
  const sortedTopics = [...topics].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedTopics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">No topics yet</h3>
          <p className="mt-2 text-sm text-gray-400">
            {currentUser 
              ? 'Click the + button to create a new topic' 
              : 'Please log in to create and vote on topics'}
          </p>
        </div>
      ) : (
        sortedTopics.map(topic => (
          <VotingCard key={topic.id} topic={topic} />
        ))
      )}
    </div>
  );
} 