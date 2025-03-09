import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function processVotesWithLLM(votingData) {
  try {
    console.log('Processing votes with LLM:', votingData)
    
    const prompt = `
You are analyzing the results of a vote to change a website's ${votingData.changeType} to ${votingData.changeValue}.
Here are the votes:
${JSON.stringify(votingData.votes, null, 2)}

Each vote has a user ID, their vote (yes/no), and their influence (number of followers).
Please analyze these votes and provide:
1. A summary of the voting results
2. The total number of yes and no votes
3. The weighted result (considering user influence)
4. A recommendation on whether to approve or reject the change
5. A brief explanation for your recommendation

Format your response as a JSON object with the following structure:
{
  "summary": "string",
  "yesVotes": number,
  "noVotes": number,
  "yesWeight": number,
  "noWeight": number,
  "recommendation": "approve" or "reject",
  "explanation": "string",
  "changeType": "color" or "font",
  "changeValue": "string"
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a vote analysis assistant that processes voting data and provides summaries and recommendations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const content = response.choices[0].message.content
    let result
    
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/)
      const jsonString = jsonMatch ? jsonMatch[1] : content
      result = JSON.parse(jsonString)
    } catch (err) {
      console.error('Error parsing LLM response:', err)
      console.log('Raw response:', content)
      
      // Fallback to a simple result
      result = {
        summary: 'Failed to parse LLM response',
        yesVotes: 0,
        noVotes: 0,
        yesWeight: 0,
        noWeight: 0,
        recommendation: 'reject',
        explanation: 'Error in processing',
        changeType: votingData.changeType,
        changeValue: votingData.changeValue
      }
    }
    
    // Add original voting data for reference
    result.originalVotes = votingData.votes
    result.changeType = votingData.changeType
    result.changeValue = votingData.changeValue
    
    return result
  } catch (error) {
    console.error('Error in processVotesWithLLM:', error)
    throw error
  }
}

export async function processPromptWithLLM(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful assistant that interprets user requests to change website settings.
          Your job is to extract what the user wants to change about the website, without making any judgment about whether the change should be allowed.
          
          Extract the following information:
          1. What aspect of the website the user wants to change
          2. The specific value they want to change it to
          
          Return a JSON object with the following structure:
          {
            "title": "A short title describing the requested change",
            "changeType": "The aspect of the website to change (e.g., color, font, layout, etc.)",
            "changeValue": "The specific value requested"
          }`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error processing prompt with LLM:', error);
    throw error;
  }
}

export { processVotesWithLLM }
