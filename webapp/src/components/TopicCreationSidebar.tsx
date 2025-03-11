import { useApp } from '@/context/AppContext';
import { useState } from 'react';

interface TopicCreationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TopicCreationSidebar({ isOpen, onClose }: TopicCreationSidebarProps) {
  const { createTopicFromNaturalLanguage, settings } = useApp();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    if (!prompt.trim()) {
      setError('Please enter a description of what you want to change');
      setIsSubmitting(false);
      return;
    }

    try {
      await createTopicFromNaturalLanguage(prompt);
      setPrompt('');
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Sidebar */}
      <div 
        className="absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-lg transform transition-transform duration-300 ease-in-out"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold" style={{ color: settings.primaryColor }}>Create New Topic</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="mb-4 flex-1">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Describe what you want to change
              </label>
              <textarea
                id="prompt"
                className="w-full h-40 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: Change the website color to dark blue"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isSubmitting}
              ></textarea>
              <p className="mt-2 text-sm text-gray-500">
                Use natural language to describe your proposed change. Currently, only color and font changes are supported.
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
                Topic created successfully! Voting will be open for 30 seconds.
              </div>
            )}
            
            <div className="mt-auto">
              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={isSubmitting}
                style={{ backgroundColor: settings.primaryColor }}
              >
                {isSubmitting ? 'Processing...' : 'Create Topic'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 