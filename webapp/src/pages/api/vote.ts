import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { changeType, changeValue, votes } = req.body;

    if (!changeType || !changeValue || !votes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send to backend for processing
    const response = await fetch('http://localhost:3001/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType,
        changeValue,
        votes,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Return the result
    return res.status(200).json({ 
      success: true,
      result
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Backend API request failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 