import dotenv from 'dotenv'
import fs from 'fs/promises'
import OpenAI from 'openai'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function generateCode(changeRequest) {
  try {
    console.log('Generating code for change request:', changeRequest)
    
    // Determine which files need to be modified based on the change type
    let filesToModify = []
    
    if (changeRequest.changeType === 'color') {
      filesToModify = [
        '../webapp/src/styles/globals.css',
        '../webapp/src/context/AppContext.tsx'
      ]
    } else if (changeRequest.changeType === 'font') {
      filesToModify = [
        '../webapp/src/styles/globals.css',
        '../webapp/src/context/AppContext.tsx',
        '../webapp/src/pages/_document.tsx'
      ]
    }
    
    // Read the current content of the files
    const fileContents = {}
    for (const filePath of filesToModify) {
      try {
        const absolutePath = path.resolve(__dirname, filePath)
        const content = await fs.readFile(absolutePath, 'utf8')
        fileContents[filePath] = content
      } catch (err) {
        console.error(`Error reading file ${filePath}:`, err)
        fileContents[filePath] = `Error: Could not read file ${filePath}`
      }
    }
    
    const prompt = `
You are a code modification assistant. You need to update the website code to implement a change that was approved by users.

Change request:
${JSON.stringify(changeRequest, null, 2)}

Here are the current contents of the files that need to be modified:

${Object.entries(fileContents).map(([filePath, content]) => `
--- ${filePath} ---
\`\`\`
${content}
\`\`\`
`).join('\n')}

Please provide the updated code for each file. For each file, explain what changes you're making and why.
If you're adding a new font, make sure to include the appropriate Google Fonts link in _document.tsx.
For colors, use appropriate CSS variables in globals.css.

Format your response as a JSON object with the following structure:
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "full updated content of the file",
      "explanation": "explanation of changes made"
    },
    ...
  ]
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a code generation assistant that modifies website code to implement approved changes.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
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
        files: [],
        success: false,
        error: 'Failed to parse code generation response'
      }
      return result
    }
    
    // Apply the changes to the files
    for (const file of result.files) {
      try {
        const absolutePath = path.resolve(__dirname, file.path)
        await fs.writeFile(absolutePath, file.content)
        console.log(`Updated file: ${file.path}`)
      } catch (err) {
        console.error(`Error writing file ${file.path}:`, err)
        file.error = `Failed to write file: ${err.message}`
      }
    }
    
    result.success = true
    return result
  } catch (error) {
    console.error('Error in generateCode:', error)
    return {
      files: [],
      success: false,
      error: error.message
    }
  }
}

export { generateCode }
