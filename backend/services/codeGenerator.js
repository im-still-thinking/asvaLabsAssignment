import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateWithGPT4oMini, generateWithStarCoder, parseLLMOutput } from './llmService.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateCode(changeRequest) {
  try {
    console.log('Generating code for change request:', changeRequest)
    
    // Automatically detect files to modify based on the change type
    let filesToModify = await detectFilesToModify(changeRequest)
    
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
# Code Modification Task

You need to update the website code to implement a change that was approved by users.

## Change Request
${JSON.stringify(changeRequest, null, 2)}

## Current File Contents

${Object.entries(fileContents).map(([filePath, content]) => `
### ${filePath}
\`\`\`
${content}
\`\`\`
`).join('\n')}

## Instructions
Please provide the updated code for each file. For each file, explain what changes you're making and why.
If you're adding a new font, make sure to include the appropriate Google Fonts link in _document.tsx.
For colors, use appropriate CSS variables in globals.css.

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
`

    let result;
    
    // Try StarCoder first
    try {
      console.log('Using StarCoder for code generation...')
      const starcoderOutput = await generateWithStarCoder(prompt)
      result = parseLLMOutput(starcoderOutput)
      console.log('Successfully generated code with StarCoder')
    } catch (starcoderError) {
      console.error('StarCoder failed, falling back to GPT-4o-mini:', starcoderError)
      
      // Fallback to GPT-4o-mini
      try {
        console.log('Using GPT-4o-mini for code generation...')
        const gpt4oOutput = await generateWithGPT4oMini(prompt)
        result = parseLLMOutput(gpt4oOutput)
        console.log('Successfully generated code with GPT-4o-mini')
      } catch (gpt4oError) {
        console.error('GPT-4o-mini also failed:', gpt4oError)
        throw new Error('All code generation services failed')
      }
    }
    
    // Apply the changes
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
    
    result.success = result.files.length > 0 && !result.files.some(f => f.error)
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

// Automatically detect which files need to be modified based on the change type
async function detectFilesToModify(changeRequest) {
  const baseDir = path.resolve(__dirname, '../../webapp')
  const filesToModify = []
  
  // Start with common files that might need changes
  if (changeRequest.changeType === 'color') {
    // Look for CSS files
    try {
      const cssFiles = await findFiles(baseDir, '.css')
      const globalCssFiles = cssFiles.filter(file => 
        file.includes('global') || file.includes('main') || file.includes('styles')
      )
      filesToModify.push(...globalCssFiles)
      
      // Look for theme files
      const themeFiles = await findFiles(baseDir, 'theme')
      filesToModify.push(...themeFiles)
      
      // Add context files that might handle settings
      const contextFiles = await findFiles(baseDir, 'context')
      const settingsContexts = contextFiles.filter(file => 
        file.includes('App') || file.includes('Theme') || file.includes('Settings')
      )
      filesToModify.push(...settingsContexts)
    } catch (error) {
      console.error('Error finding color-related files:', error)
    }
  } else if (changeRequest.changeType === 'font') {
    // Look for CSS files
    try {
      const cssFiles = await findFiles(baseDir, '.css')
      const globalCssFiles = cssFiles.filter(file => 
        file.includes('global') || file.includes('main') || file.includes('styles')
      )
      filesToModify.push(...globalCssFiles)
      
      // Look for document files (for font imports)
      const documentFiles = await findFiles(baseDir, '_document')
      filesToModify.push(...documentFiles)
      
      // Add context files that might handle settings
      const contextFiles = await findFiles(baseDir, 'context')
      const settingsContexts = contextFiles.filter(file => 
        file.includes('App') || file.includes('Theme') || file.includes('Settings')
      )
      filesToModify.push(...settingsContexts)
    } catch (error) {
      console.error('Error finding font-related files:', error)
    }
  }
  
  // If no files were found, use default paths
  if (filesToModify.length === 0) {
    console.log('No files detected automatically, using default paths')
    if (changeRequest.changeType === 'color') {
      filesToModify.push(
        '../../webapp/src/styles/globals.css',
        '../../webapp/src/context/AppContext.tsx'
      )
    } else if (changeRequest.changeType === 'font') {
      filesToModify.push(
        '../../webapp/src/styles/globals.css',
        '../../webapp/src/context/AppContext.tsx',
        '../../webapp/src/pages/_document.tsx'
      )
    }
  }
  
  // Make paths relative to the current directory
  return filesToModify.map(file => {
    if (file.startsWith(path.resolve(__dirname, '../..'))) {
      return path.relative(__dirname, file)
    }
    return file
  })
}

// Helper function to find files recursively
async function findFiles(dir, pattern) {
  const files = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Skip node_modules and .next directories
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          const subFiles = await findFiles(fullPath, pattern)
          files.push(...subFiles)
        }
      } else if (entry.name.includes(pattern)) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
  
  return files
}

export { generateCode }
