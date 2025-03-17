import dotenv from 'dotenv'
import OpenAI from 'openai'
import { ALLOWED_CHANGES } from './policyEngine.js'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/bigcode/starcoder2-15b'
// const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY


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

    result.originalVotes = votingData.votes
    result.changeType = votingData.changeType
    result.changeValue = votingData.changeValue

    return result
  } catch (error) {
    console.error('Error in processVotesWithLLM:', error)
    throw error
  }
}


async function processPromptWithLLM(prompt) {
  try {
    // Generate the allowed changes section of the prompt
    const allowedChangesText = ALLOWED_CHANGES
      .map(change => `- ${change.type}: ${change.description}\n  Validation: ${change.validation}`)
      .join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert UI/UX designer and web developer who helps interpret user requests to change website settings.
          Your job is to understand what users want to change about the website, even when they use descriptive or natural language.
          
          ALLOWED CHANGES:
          ${allowedChangesText}
          
          INTERPRETATION GUIDELINES:
          1. Deeply understand the user's intent:
             - Analyze descriptive terms (e.g., "vibrant", "professional", "modern")
             - Consider context and common design principles
             - Think about user experience and accessibility
          
          2. For colors:
             - Understand color psychology and meaning
             - Consider accessibility and contrast ratios
             - Convert descriptive terms into appropriate hex codes
             - Ensure colors align with the described mood/intent
          
          3. For fonts:
             - Consider readability and accessibility
             - Match font personality with described intent
             - Choose appropriate web-safe or Google Fonts
             - Consider the context (e.g., professional site vs creative site)
          
          4. For any value:
             - Ensure it meets the validation criteria
             - Consider the overall user experience
             - Think about accessibility implications
             - Make choices that enhance usability
          
          Return a JSON object with the following structure:
          {
            "title": "A clear title describing the interpreted change",
            "changeType": "The aspect to change (one of: ${ALLOWED_CHANGES.map(c => c.type).join(', ')})",
            "changeValue": "The specific value that meets validation criteria",
            "interpretation": "Detailed explanation of your interpretation, including why you chose this specific value"
          }
          
          Example thought process:
          1. User says "make it more vibrant"
             - Understand they want more energy and life in the design
             - Consider current design context
             - Choose an appropriate vibrant color that maintains accessibility
             - Explain your reasoning
          
          2. User says "make it more professional"
             - Consider the business context
             - Think about industry standards
             - Choose appropriate professional elements
             - Explain your choices`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7, // Increased to allow more creative interpretations
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log('LLM interpretation:', result);
    return result;
  } catch (error) {
    console.error('Error processing prompt with LLM:', error);
    throw error;
  }
}


// async function generateWithStarCoder(prompt) {
//   try {
//     console.log('Generating code with StarCoder...')

//     if (!HUGGINGFACE_API_KEY) {
//       throw new Error('HUGGINGFACE_API_KEY is not set in environment variables')
//     }

//     const response = await fetch(HUGGINGFACE_API_URL, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         inputs: prompt,
//         parameters: {
//           max_new_tokens: 2000,
//           temperature: 0.2,
//           top_p: 0.95,
//           do_sample: true,
//           return_full_text: false
//         }
//       })
//     })

//     if (!response.ok) {
//       const errorText = await response.text()
//       throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`)
//     }

//     const result = await response.json()

//     if (Array.isArray(result) && result.length > 0) {
//       return result[0].generated_text
//     } else {
//       throw new Error('Unexpected response format from Hugging Face API')
//     }
//   } catch (error) {
//     console.error('Error in generateWithStarCoder:', error)
//     throw error
//   }
// }


// async function generateWithGPT4oMini(prompt) {
//   try {
//     console.log('Generating code with GPT-4o-mini...')

//     if (!process.env.OPENAI_API_KEY) {
//       throw new Error('OPENAI_API_KEY is not set in environment variables')
//     }

//     const response = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       messages: [
//         {
//           role: 'system',
//           content: 'You are a helpful assistant that specializes in generating code for web applications. Your task is to modify code files based on user requirements. Always provide complete file contents in your response, formatted as JSON.'
//         },
//         {
//           role: 'user',
//           content: prompt
//         }
//       ],
//       temperature: 0.2,
//       max_tokens: 4000
//     })

//     if (response.choices && response.choices.length > 0) {
//       return response.choices[0].message.content
//     } else {
//       throw new Error('Unexpected response format from OpenAI API')
//     }
//   } catch (error) {
//     console.error('Error in generateWithGPT4oMini:', error)
//     throw error
//   }
// }


function parseLLMOutput(output) {
  try {
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/) ||
      output.match(/```\n([\s\S]*?)\n```/) ||
      output.match(/({[\s\S]*})/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    return JSON.parse(output)
  } catch (error) {
    console.error('Error parsing LLM output:', error)
    throw new Error('Failed to parse LLM output as JSON')
  }
}

export {
  parseLLMOutput, processPromptWithLLM, processVotesWithLLM
}

