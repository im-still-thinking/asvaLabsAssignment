import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, userId } = req.body;

    if (!prompt || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send to backend for processing by the vote agent
    const response = await fetch('http://localhost:3001/api/interpret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Return the interpreted topic data
    return res.status(200).json({ 
      success: true,
      topicData: result.topicData
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Failed to interpret topic',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 