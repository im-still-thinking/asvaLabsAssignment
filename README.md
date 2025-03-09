# Peer-to-Peer Communication System with AI Agents

This project implements a peer-to-peer communication system featuring three AI agents that interact to process user votes and dynamically update a web application.

## Project Overview

The system consists of:

1. **P2P Communication Layer**: Built with libp2p for agent communication
2. **AI Agents**:
   - Vote Agent: Processes and summarizes voting results
   - Policy Agent: Evaluates vote summaries and makes decisions
   - Code Agent: Generates and applies code changes
3. **Web Application**: A Next.js app where users can vote on changes to the website's appearance

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd p2p-ai-agents
   ```

2. Install dependencies for the backend:
   ```
   npm install
   ```

3. Install dependencies for the webapp:
   ```
   cd webapp
   npm install
   cd ..
   ```

4. Create a `.env` file in the root directory based on `.env.example`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

### Running the Application

1. Start the backend and webapp in development mode:
   ```
   npm run dev
   ```

   This will start both the backend server and the Next.js webapp concurrently.

2. Alternatively, you can start them separately:
   ```
   # Start the backend only
   npm run dev:backend
   
   # Start the webapp only
   npm run dev:webapp
   ```

3. Access the webapp at http://localhost:3000

## Usage

1. Log in using one of the mock users (user1, user2, user3, user4, user5)
2. Create a topic to propose a change to the website's color or font
3. Vote on active topics
4. After the 5-minute voting period, the system will:
   - Process the votes using the Vote Agent
   - Evaluate the results using the Policy Agent
   - If approved, generate and apply code changes using the Code Agent
   - Update the webapp to reflect the changes

## Project Structure

- `/backend`: Backend code (JavaScript)
  - `/agents`: AI agent implementations
  - `/p2p`: Peer-to-peer communication system
  - `/services`: Services for LLM integration, policy evaluation, and code generation
- `/webapp`: Frontend code (TypeScript)
  - `/src/pages`: Next.js pages
  - `/src/components`: React components
  - `/src/context`: React context for state management
  - `/src/styles`: CSS styles
  - `/src/types`: TypeScript type definitions

## License

[MIT License](LICENSE) 