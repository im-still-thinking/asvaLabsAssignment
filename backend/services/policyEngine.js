import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Define allowed changes - this drives the prompt generation
const ALLOWED_CHANGES = [
  {
    type: 'color',
    description: 'Change the primary color using hex color codes (e.g., #FF0000)',
    validation: 'Must be a valid hex color code'
  },
  {
    type: 'font',
    description: 'Change the font family (e.g., Arial, Roboto)',
    validation: 'Must be a web-safe font or Google Font'
  }
  // Add new changes here to whitelist them
]

async function evaluateWithPolicyEngine(voteSummary) {
  try {
    console.log('Evaluating with policy engine:', voteSummary)

    // Generate the allowed changes section of the prompt
    const allowedChangesText = ALLOWED_CHANGES
      .map(change => `- ${change.type}: ${change.description}\n  Validation: ${change.validation}`)
      .join('\n')

    const prompt = `
You are a policy engine for a website that allows users to vote on changing the website's appearance.
You need to evaluate a vote summary and decide whether to approve or reject the proposed change.

Here is the vote summary:
${JSON.stringify(voteSummary, null, 2)}

ALLOWED CHANGES:
${allowedChangesText}

Policy rules:
1. ONLY the changes listed above are allowed - reject any other change types immediately
2. Changes should be approved if they have more weighted yes votes than no votes
3. Changes should be rejected if they might harm user experience
4. Each change type must meet its specific validation criteria

Please evaluate this vote and provide your decision in the following JSON format:
{
  "approved": boolean,
  "justification": "string explaining your decision",
  "changeType": "string - the type of change requested",
  "changeValue": "string - the new value to apply",
  "summary": "string - brief summary of the change"
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

    const result = JSON.parse(response.choices[0].message.content)
    result.voteSummary = voteSummary

    // Additional validation - ensure the change type is actually allowed
    if (!ALLOWED_CHANGES.some(change => change.type === result.changeType)) {
      result.approved = false
      result.justification = `Change type "${result.changeType}" is not in the allowed changes list`
    }

    return result
  } catch (error) {
    console.error('Error in evaluateWithPolicyEngine:', error)
    throw error
  }
}

// Export both the function and the allowed changes list
export { ALLOWED_CHANGES, evaluateWithPolicyEngine }

