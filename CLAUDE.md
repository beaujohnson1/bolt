# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Main Commands
- `npm run dev` - Start development server on port 5173 (configured in vite.config.ts)
- `npm run build` - Build for production (`tsc && vite build`)
- `npm run lint` - Run ESLint on codebase
- `npm run preview` - Preview production build

### Deployment
- Deploys to Netlify automatically
- Netlify functions in `/netlify/functions/` handle backend operations

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 with TypeScript, Vite build tool
- **Styling**: Tailwind CSS with custom dark theme (cyber-blue colors)
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase PostgreSQL
- **AI Services**: OpenAI GPT-4, Google Vision API
- **Deployment**: Netlify with serverless functions

### Project Structure
```
src/
├── components/        # Reusable React components
├── pages/            # Page-level components (routing destinations)
├── contexts/         # React contexts (AuthContext for user state)
├── hooks/            # Custom React hooks
├── lib/              # External service clients (Supabase, OpenAI, Google Vision)
├── services/         # Business logic and API integrations
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── ai/              # AI-related utilities and schemas
```

### Key Architectural Patterns

#### Authentication Flow
- Uses Supabase Auth with PKCE flow for security
- AuthContext provides global user state management
- Protected routes wrap authenticated pages
- User profiles auto-created via RPC function `create_user_profile`

#### Data Management
- Supabase client with custom timeout handling (8s) in `lib/supabase.ts`
- Database types defined in both `lib/supabase.ts` and `types/index.ts`
- Promise utilities in `utils/promiseUtils.ts` for timeout and retry logic

#### AI Integration
- Photo analysis via Google Vision API + OpenAI GPT-4
- Item categorization and pricing suggestions
- eBay API integration for market research (uses Netlify proxy functions)
- AI schemas in `ai/schema.ts` for structured data

#### Environment Configuration
- Environment detection in `EnvGuard.tsx`
- Dual eBay environment support (sandbox/production)
- Environment variables prefixed with `VITE_` for client access

### Important Implementation Details

#### Supabase Integration
- Client initialization with retry logic and detailed logging
- Custom fetch wrapper with timeout for all requests
- Robust error handling with fallback user objects

#### eBay API Service
- Proxy-based API calls through Netlify functions
- Mock data fallbacks for development environment
- Multiple API endpoints: Trading, Browse, Sell Metadata, Finding Service

#### Route Structure
- `/` - Landing page (unauthenticated)
- `/app` - Main dashboard (protected)
- `/capture` - Photo capture page (protected)
- `/details/:itemId` - Item details editing (protected)
- `/preview/:itemId` - Listing preview (protected)
- `/test-connection` - eBay API testing
- `/auth/callback` - OAuth callback handler

### Development Notes
- Dark mode support via Tailwind's `class` strategy
- TypeScript strict mode enabled
- ESLint configuration for React hooks and refresh
- Vite dev server configured for network access (`host: true`)

### Required Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# eBay Sandbox
VITE_EBAY_SANDBOX_APP_ID=your_sandbox_app_id
VITE_EBAY_SANDBOX_DEV_ID=your_sandbox_dev_id
VITE_EBAY_SANDBOX_CERT_ID=your_sandbox_cert_id
VITE_EBAY_SANDBOX_BASE_URL=https://api.sandbox.ebay.com

# eBay Production  
VITE_EBAY_PROD_APP_ID=your_production_app_id
VITE_EBAY_PROD_DEV_ID=your_production_dev_id
VITE_EBAY_PROD_CERT_ID=your_production_cert_id
VITE_EBAY_PROD_BASE_URL=https://api.ebay.com
```

### Testing
- Use `/test-connection` route to verify eBay API configuration
- Use `netlify dev` for local development with functions
- Check browser console for detailed service logs (prefixed with service names)