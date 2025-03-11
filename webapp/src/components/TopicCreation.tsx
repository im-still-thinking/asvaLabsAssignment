import { useApp } from '@/context/AppContext';
import { memo, useCallback, useMemo, useState } from 'react';
import { ColorPreview } from './shared/VotingComponents';

// Input field component for reusability
const FormField = memo(({ 
  id, 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  rows = 1,
  error = ''
}: { 
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
}) => {
  const isTextarea = rows > 1;
  
  return (
    <div className="mb-4">
      <label htmlFor={id} className="label block mb-1 font-medium text-sm">
        {label}
      </label>
      {isTextarea ? (
        <textarea
          id={id}
          className={`input w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          id={id}
          className={`input w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
});

FormField.displayName = 'FormField';

// Radio button group component
const RadioGroup = memo(({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="mb-4">
      <label className="label block mb-1 font-medium text-sm">{label}</label>
      <div className="flex gap-4">
        {options.map(option => (
          <label key={option.value} className="flex items-center">
            <input
              type="radio"
              name={label.replace(/\s+/g, '')}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mr-2"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
});

RadioGroup.displayName = 'RadioGroup';

function TopicCreation() {
  const { createTopic } = useApp();
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    changeType: 'color' as 'color' | 'font',
    changeValue: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Memoize change type options
  const changeTypeOptions = useMemo(() => [
    { value: 'color', label: 'Color' },
    { value: 'font', label: 'Font' }
  ], []);

  // Form field update handler
  const updateField = useCallback((field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Clear success message when user starts typing again
    if (success) {
      setSuccess(false);
    }
  }, [errors, success]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formState.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formState.changeValue.trim()) {
      newErrors.changeValue = `${formState.changeType === 'color' ? 'Color' : 'Font'} value is required`;
    } else if (formState.changeType === 'color' && !formState.changeValue.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
      newErrors.changeValue = 'Please enter a valid hex color code (e.g., #ff0000)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  // Form submission handler
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createTopic({
      title: formState.title,
      description: formState.description,
      changeType: formState.changeType,
      changeValue: formState.changeValue,
    });

    // Reset form
    setFormState({
      title: '',
      description: '',
      changeType: 'color',
      changeValue: '',
    });
    setSuccess(true);
  }, [formState, createTopic, validateForm]);

  // Memoize color preview
  const colorPreview = useMemo(() => {
    if (formState.changeType !== 'color') return null;
    
    const isValidColor = formState.changeValue.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
    if (!isValidColor) return null;
    
    return <ColorPreview color={formState.changeValue} />;
  }, [formState.changeType, formState.changeValue]);

  return (
    <div className="card bg-white p-4 rounded-lg shadow">
      <form onSubmit={handleSubmit}>
        <FormField
          id="title"
          label="Title"
          value={formState.title}
          onChange={(value) => updateField('title', value)}
          placeholder="e.g., Change website color to blue"
          error={errors.title}
        />

        <FormField
          id="description"
          label="Description"
          value={formState.description}
          onChange={(value) => updateField('description', value)}
          placeholder="Explain why you want to make this change"
          rows={3}
          error={errors.description}
        />

        <RadioGroup
          label="Change Type"
          options={changeTypeOptions}
          value={formState.changeType}
          onChange={(value) => updateField('changeType', value as 'color' | 'font')}
        />

        <div className="mb-6">
          <FormField
            id="changeValue"
            label={formState.changeType === 'color' ? 'Color Value (hex)' : 'Font Name'}
            value={formState.changeValue}
            onChange={(value) => updateField('changeValue', value)}
            placeholder={
              formState.changeType === 'color'
                ? '#3b82f6 (hex color code)'
                : 'Arial, sans-serif'
            }
            error={errors.changeValue}
          />
          {colorPreview}
        </div>

        {success && (
          <div className="text-green-500 text-sm mb-4 p-2 bg-green-50 rounded">
            Topic created successfully! Voting will be open for 5 minutes.
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          Create Topic
        </button>
      </form>
    </div>
  );
}

export default memo(TopicCreation); 