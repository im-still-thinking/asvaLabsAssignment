import Layout from '@/components/Layout';
import Login from '@/components/Login';
import TopicFeed from '@/components/TopicFeed';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { currentUser } = useApp();

  return (
    <Layout>
      {!currentUser ? (
        <Login />
      ) : (
        <TopicFeed />
      )}
    </Layout>
  );
} 