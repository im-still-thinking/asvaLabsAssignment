import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function evaluateWithPolicyEngine(voteSummary) {
  try {
    console.log('Evaluating with policy engine:', voteSummary)
    
    const prompt = `
You are a policy engine for a website that allows users to vote on changing the website's appearance.
You need to evaluate a vote summary and decide whether to approve or reject the proposed change.

Here is the vote summary:
${JSON.stringify(voteSummary, null, 2)}

Policy rules:
1. Changes should be approved if they have more weighted yes votes than no votes
2. Changes should be rejected if they might harm user experience
3. For color changes, ensure the color is web-safe and accessible
4. For font changes, ensure the font is common and readable

Please evaluate this vote and provide:
1. Your decision (approve or reject)
2. A justification for your decision
3. If approved, a summary of the changes to be made

Format your response as a JSON object with the following structure:
{
  "approved": true or false,
  "justification": "string",
  "changeType": "color" or "font",
  "changeValue": "string",
  "summary": "string"
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a policy evaluation assistant that reviews voting results and makes decisions based on predefined policies.' },
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
        approved: false,
        justification: 'Error in processing policy decision',
        changeType: voteSummary.changeType,
        changeValue: voteSummary.changeValue,
        summary: 'Failed to evaluate policy'
      }
    }
    
    // Add original vote summary for reference
    result.voteSummary = voteSummary
    
    return result
  } catch (error) {
    console.error('Error in evaluateWithPolicyEngine:', error)
    throw error
  }
}

export async function evaluatePolicy(voteSummary) {
  try {
    console.log('Evaluating policy for:', voteSummary)
    
    // First check if the change type is allowed
    const allowedChangeTypes = ['color', 'font']
    
    if (!allowedChangeTypes.includes(voteSummary.changeType)) {
      return {
        approved: false,
        reason: `Change type "${voteSummary.changeType}" is not allowed. Only color and font changes are permitted.`,
        voteSummary
      }
    }
    
    // For color changes, validate the format
    if (voteSummary.changeType === 'color') {
      // Check if it's a valid hex color
      const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(voteSummary.changeValue)
      if (!isValidHex) {
        return {
          approved: false,
          reason: `Invalid color format. Must be a hex color code (e.g., #FF0000).`,
          voteSummary
        }
      }
    }
    
    // For font changes, validate that it's a reasonable font family string
    if (voteSummary.changeType === 'font') {
      // Check if it contains at least one font name and a fallback
      const hasFallback = voteSummary.changeValue.includes(',')
      if (!hasFallback) {
        // Add a fallback if none exists
        voteSummary.changeValue = `${voteSummary.changeValue}, sans-serif`
      }
    }
    
    // Check the vote recommendation
    if (voteSummary.recommendation === 'approve') {
      return {
        approved: true,
        reason: 'Change approved based on voting results and policy compliance.',
        voteSummary
      }
    } else {
      return {
        approved: false,
        reason: 'Change rejected based on voting results.',
        voteSummary
      }
    }
  } catch (error) {
    console.error('Error in policy evaluation:', error)
    return {
      approved: false,
      reason: 'Error in policy evaluation: ' + error.message,
      voteSummary
    }
  }
}

export { evaluateWithPolicyEngine }
