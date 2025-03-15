import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  analyzeCodebaseWithLLM,
  determineSettingsWithLLM,
  generateCodeChangesWithLLM
} from './llmService.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


async function generateCodebaseRepresentation() {
  try {
    const webappDir = path.resolve(__dirname, '../../webapp')
    const representation = {
      structure: await generateDirectoryStructure(webappDir, 3), // Limit depth to 3 levels
      keyFiles: await identifyKeyFiles(webappDir)
    }
    return representation
  } catch (error) {
    console.error('Error generating codebase representation:', error)
    throw error
  }
}


async function generateDirectoryStructure(dir, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return { type: 'directory', name: path.basename(dir), children: ['...'] }
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const children = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
        continue
      }

      if (entry.isDirectory()) {
        children.push(await generateDirectoryStructure(fullPath, maxDepth, currentDepth + 1))
      } else {
        children.push({
          type: 'file',
          name: entry.name,
          extension: path.extname(entry.name)
        })
      }
    }

    return {
      type: 'directory',
      name: path.basename(dir),
      path: path.relative(path.resolve(__dirname, '../..'), dir),
      children
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
    return { type: 'directory', name: path.basename(dir), error: error.message }
  }
}

async function identifyKeyFiles(baseDir) {
  const keyFilePaths = [
    'src/styles/globals.css',
    'src/context/AppContext.tsx',
    'src/pages/_document.tsx',
    'src/pages/_app.tsx',
    'tailwind.config.js'
  ]
  
  const keyFiles = {}
  
  for (const filePath of keyFilePaths) {
    try {
      const fullPath = path.join(baseDir, filePath)
      const content = await fs.readFile(fullPath, 'utf8')
      keyFiles[filePath] = {
        path: filePath,
        content: content,
        extension: path.extname(filePath)
      }
    } catch (error) {
      console.error(`Error reading key file ${filePath}:`, error)
      keyFiles[filePath] = {
        path: filePath,
        error: `Could not read file: ${error.message}`,
        extension: path.extname(filePath)
      }
    }
  }
  
  return keyFiles
}


async function readFilesToModify(filesToModify) {
  const fileContents = {}
  
  for (const file of filesToModify) {
    const filePath = typeof file === 'string' ? file : file.path
    
    try {
      const cleanPath = filePath.replace(/^webapp\//, '')
      const absolutePath = path.resolve(__dirname, '../../webapp', cleanPath)
      const content = await fs.readFile(absolutePath, 'utf8')
      fileContents[filePath] = content
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err)
      fileContents[filePath] = `Error: Could not read file ${filePath}`
    }
  }
  
  return fileContents
}

async function applyCodeChanges(files) {
  const updatedFiles = []
  
  for (const file of files) {
    try {
      const cleanPath = file.path.replace(/^webapp\//, '')
      const absolutePath = path.resolve(__dirname, '../../webapp', cleanPath)
      
      const directory = path.dirname(absolutePath)
      await fs.mkdir(directory, { recursive: true })
      
      await fs.writeFile(absolutePath, file.content)
      console.log(`Updated file: ${file.path}`)
      updatedFiles.push({
        ...file,
        success: true
      })
    } catch (err) {
      console.error(`Error writing file ${file.path}:`, err)
      updatedFiles.push({
        ...file,
        success: false,
        error: err.message
      })
    }
  }
  
  return updatedFiles
}


async function generateCode(changeRequest) {
  try {
    console.log('Generating code for change request:', changeRequest)
    
    const codebaseRepresentation = await generateCodebaseRepresentation()
    
    const analysisResult = await analyzeCodebaseWithLLM(changeRequest, codebaseRepresentation)
    console.log('Analysis result:', analysisResult)
    
    const filesToModify = analysisResult.filesToModify || []
    const fileContents = await readFilesToModify(filesToModify)
    
    const codeChanges = await generateCodeChangesWithLLM(changeRequest, filesToModify, fileContents)
    
    if (codeChanges.files && Array.isArray(codeChanges.files)) {
      for (const file of codeChanges.files) {
        if (file.content) {
          file.content = file.content.replace(/^```[\w-]*\n/, '').replace(/\n```$/, '');
        }
      }
    }
  
    const updatedFiles = await applyCodeChanges(codeChanges.files || [])
    
    const currentSettings = {
      primaryColor: '#3b82f6',
      fontFamily: 'Inter, sans-serif'
    }
    
    let settingsUpdates = analysisResult.settingsUpdates || {}
    
    if (updatedFiles.length > 0 && updatedFiles.some(f => f.success)) {
      try {
        const updatedSettings = await determineSettingsWithLLM(
          changeRequest,
          currentSettings,
          { files: updatedFiles }
        )
        
        if (updatedSettings && Object.keys(updatedSettings).length > 0) {
          settingsUpdates = updatedSettings
        }
      } catch (settingsError) {
        console.error('Error determining settings updates:', settingsError)
      }
    }
    
    return {
      files: updatedFiles,
      settingsUpdates: settingsUpdates,
      success: updatedFiles.length > 0 && !updatedFiles.some(f => !f.success),
      explanation: analysisResult.explanation || 'Code changes applied successfully'
    }
  } catch (error) {
    console.error('Error in generateCode:', error)
    return {
      files: [],
      settingsUpdates: {},
      success: false,
      error: error.message
    }
  }
}

export { generateCode }
