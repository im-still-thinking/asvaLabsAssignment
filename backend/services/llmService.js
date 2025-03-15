import dotenv from 'dotenv'
import fetch from 'node-fetch'
import OpenAI from 'openai'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/bigcode/starcoder2-15b'
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY


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
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/({[\s\S]*})/)
      const jsonString = jsonMatch ? jsonMatch[1] : content
      result = JSON.parse(jsonString)
    } catch (err) {
      console.error('Error parsing LLM response:', err)
      console.log('Raw response:', content)
      
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


async function analyzeCodebaseWithLLM(changeRequest, codebaseRepresentation) {
  try {
    console.log('Analyzing codebase with LLM...')
    
    const prompt = `
# Codebase Analysis Task

You are an expert code analyst. Your task is to analyze a codebase and determine what changes need to be made to implement a requested change.

## Change Request
${JSON.stringify(changeRequest, null, 2)}

## Codebase Structure
${JSON.stringify(codebaseRepresentation.structure, null, 2)}

## Key Files
${Object.keys(codebaseRepresentation.keyFiles).map(key => `- ${key} (${codebaseRepresentation.keyFiles[key].extension})`).join('\n')}

## Current Settings
The application uses the following settings in the AppContext:
- primaryColor: The main color used throughout the application (in hex format, e.g., "#3b82f6")
- fontFamily: The font family used throughout the application

## Instructions
Based on the change request and codebase structure, determine:
1. Which files need to be modified to implement the change
2. What specific changes need to be made to each file
3. How application settings should be updated

IMPORTANT: For color changes, you MUST update the "primaryColor" setting with a valid hex color code (e.g., "#FFFF00" for yellow).
For font changes, you MUST update the "fontFamily" setting with the new font family.

Format your response as a JSON object with the following structure:
\`\`\`json
{
  "filesToModify": [
    {
      "path": "path/to/file",
      "reason": "Explanation of why this file needs to be modified",
      "changes": "Description of changes needed"
    }
  ],
  "settingsUpdates": {
    "primaryColor": "#HEXCODE", 
    "fontFamily": "font name"
  },
  "explanation": "Overall explanation of the implementation approach"
}
\`\`\`
`

    const response = await generateWithGPT4oMini(prompt)
    return parseLLMOutput(response)
  } catch (error) {
    console.error('Error analyzing codebase with LLM:', error)
    throw error
  }
}


async function generateCodeChangesWithLLM(changeRequest, filesToModify, fileContents) {
  try {
    console.log('Generating code changes with LLM...')
    
    const prompt = `
# Code Modification Task

You need to update the website code to implement a change that was approved by users.

## Change Request
${JSON.stringify(changeRequest, null, 2)}

## Files to Modify
The following files have been identified as needing modification:
${filesToModify.map(file => `- ${file.path}: ${file.reason}`).join('\n')}

## Current File Contents
${Object.entries(fileContents).map(([filePath, content]) => `
### ${filePath}
\`\`\`${filePath.split('.').pop()}
${content}
\`\`\`
`).join('\n')}

## Instructions
Please provide the updated code for each file. For each file, explain what changes you're making and why.
Be precise and thorough in your modifications, ensuring they correctly implement the requested change.
Maintain the existing code structure and style as much as possible.

Format your response as a JSON object with the following structure:
\`\`\`json
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "full updated content of the file",
      "explanation": "explanation of changes made"
    }
  ]
}
\`\`\`

IMPORTANT: The "content" field should contain ONLY the actual code, without any markdown code block syntax.
`

    try {
      console.log('Using StarCoder for code generation...')
      const starcoderOutput = await generateWithStarCoder(prompt)
      return parseLLMOutput(starcoderOutput)
    } catch (starcoderError) {
      console.error('StarCoder failed, falling back to GPT-4o-mini:', starcoderError)
      const gpt4oOutput = await generateWithGPT4oMini(prompt)
      return parseLLMOutput(gpt4oOutput)
    }
  } catch (error) {
    console.error('Error generating code changes with LLM:', error)
    throw error
  }
}


async function determineSettingsWithLLM(changeRequest, currentSettings, codeChanges) {
  try {
    console.log('Determining settings updates with LLM...')
    
    const prompt = `
# Settings Update Task

You are an expert in web application settings. Your task is to determine how application settings should be updated based on a change request.

## Change Request
${JSON.stringify(changeRequest, null, 2)}

## Current Settings
${JSON.stringify(currentSettings, null, 2)}

## Code Changes
The following files were modified:
${codeChanges.files.map(file => `- ${file.path}: ${file.explanation || 'File was modified'}`).join('\n')}

## Instructions
Based on the change request and the files that were modified, determine how the application settings should be updated.

IMPORTANT RULES:
1. For color changes, you MUST update the "primaryColor" setting with a valid hex color code (e.g., "#FFFF00" for yellow).
2. For font changes, you MUST update the "fontFamily" setting with the new font family.
3. Return ALL current settings in your response, including those that weren't changed.
4. Do not add any new settings that don't exist in the current settings.

Format your response as a JSON object with the following structure:
\`\`\`json
{
  "primaryColor": "#HEXCODE",
  "fontFamily": "font name"
}
\`\`\`
`

    const response = await generateWithGPT4oMini(prompt)
    return parseLLMOutput(response)
  } catch (error) {
    console.error('Error determining settings with LLM:', error)
    throw error
  }
}


async function generateWithStarCoder(prompt) {
  try {
    console.log('Generating code with StarCoder...')
    
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not set in environment variables')
    }
    
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.2,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0].generated_text
    } else {
      throw new Error('Unexpected response format from Hugging Face API')
    }
  } catch (error) {
    console.error('Error in generateWithStarCoder:', error)
    throw error
  }
}


async function generateWithGPT4oMini(prompt) {
  try {
    console.log('Generating code with GPT-4o-mini...')
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that specializes in generating code for web applications. Your task is to modify code files based on user requirements. Always provide complete file contents in your response, formatted as JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    })
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content
    } else {
      throw new Error('Unexpected response format from OpenAI API')
    }
  } catch (error) {
    console.error('Error in generateWithGPT4oMini:', error)
    throw error
  }
}


function parseLLMOutput(output) {
  try {
    console.log('Parsing LLM output...');
    
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/) || 
                      output.match(/```\n([\s\S]*?)\n```/) || 
                      output.match(/{[\s\S]*?}/)
    
    let jsonString;
    if (jsonMatch) {
      jsonString = jsonMatch[1] || jsonMatch[0];
    } else {
      jsonString = output;
    }
    
    jsonString = jsonString.replace(/^```json|^```|```$/g, '').trim();
    

    jsonString = fixTruncatedStrings(jsonString);
    

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing LLM output:', error);
    console.log('Raw output:', output);
    
    try {
      return extractAndFixJSON(output);
    } catch (extractError) {
      console.error('Failed to extract and fix JSON:', extractError);
      throw new Error('Failed to parse LLM output as JSON');
    }
  }
}


function fixTruncatedStrings(jsonString) {

  const lines = jsonString.split('\n');
  const fixedLines = [];
  
  for (let line of lines) {

    const quoteCount = (line.match(/"/g) || []).length;
    

    if (quoteCount % 2 !== 0) {
      line += '"';
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}


function extractAndFixJSON(output) {
  console.log('Attempting manual JSON extraction...');
  

  if (output.includes('"files":')) {
    const filesMatch = output.match(/"files"\s*:\s*\[([\s\S]*?)\]/);
    if (filesMatch) {
      const filesContent = filesMatch[1];
      

      const fileObjects = [];
      let currentObject = '';
      let braceCount = 0;
      let inObject = false;
      
      for (let i = 0; i < filesContent.length; i++) {
        const char = filesContent[i];
        
        if (char === '{') {
          braceCount++;
          inObject = true;
        } else if (char === '}') {
          braceCount--;
        }
        
        if (inObject) {
          currentObject += char;
        }
        
        if (inObject && braceCount === 0) {
          try {
            const fixedObject = fixTruncatedStrings(currentObject);
            const parsedObject = JSON.parse(fixedObject);
            fileObjects.push(parsedObject);
          } catch (e) {
            console.error('Error parsing file object:', e);
          }
          
          currentObject = '';
          inObject = false;
        }
      }
      
      return {
        files: fileObjects
      };
    }
  }
  
  return {
    files: [],
    explanation: "Failed to parse LLM output, but created a minimal valid response."
  };
}

export {
  analyzeCodebaseWithLLM, determineSettingsWithLLM, generateCodeChangesWithLLM, generateWithGPT4oMini,
  generateWithStarCoder,
  parseLLMOutput,
  processPromptWithLLM,
  processVotesWithLLM
}

