import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function Login() {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      setError('Please enter a username');
      return;
    }
    
    // Check if username is one of the mock users
    const validUsernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
    if (!validUsernames.includes(username)) {
      setError(`Invalid username. Try one of: ${validUsernames.join(', ')}`);
      return;
    }
    
    login(username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to P2P AI Agents
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use one of the mock users: user1, user2, user3, user4, user5
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 