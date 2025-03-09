import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function TopicCreation() {
  const { createTopic } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<'color' | 'font'>('color');
  const [changeValue, setChangeValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!title || !description || !changeValue) {
      setError('Please fill in all fields');
      return;
    }

    // Validate color format if changeType is color
    if (changeType === 'color' && !changeValue.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
      setError('Please enter a valid hex color code (e.g., #ff0000)');
      return;
    }

    createTopic({
      title,
      description,
      changeType,
      changeValue,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setChangeType('color');
    setChangeValue('');
    setSuccess(true);
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="label">
            Title
          </label>
          <input
            type="text"
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Change website color to blue"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="label">
            Description
          </label>
          <textarea
            id="description"
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain why you want to make this change"
          ></textarea>
        </div>

        <div className="mb-4">
          <label className="label">Change Type</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="changeType"
                checked={changeType === 'color'}
                onChange={() => setChangeType('color')}
                className="mr-2"
              />
              Color
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="changeType"
                checked={changeType === 'font'}
                onChange={() => setChangeType('font')}
                className="mr-2"
              />
              Font
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="changeValue" className="label">
            {changeType === 'color' ? 'Color Value (hex)' : 'Font Name'}
          </label>
          <input
            type="text"
            id="changeValue"
            className="input"
            value={changeValue}
            onChange={(e) => setChangeValue(e.target.value)}
            placeholder={
              changeType === 'color'
                ? '#3b82f6 (hex color code)'
                : 'Arial, sans-serif'
            }
          />
          {changeType === 'color' && (
            <div className="mt-2 flex items-center gap-2">
              <span>Preview:</span>
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{
                  backgroundColor: changeValue.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
                    ? changeValue
                    : 'transparent',
                }}
              ></div>
            </div>
          )}
        </div>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        {success && (
          <div className="text-green-500 text-sm mb-4">
            Topic created successfully! Voting will be open for 5 minutes.
          </div>
        )}

        <button type="submit" className="btn btn-primary">
          Create Topic
        </button>
      </form>
    </div>
  );
} 