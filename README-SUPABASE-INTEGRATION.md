# Supabase Integration for Chat Application

This document outlines the integration of Supabase with the Next.js chat application.

## Overview

The chat application has been integrated with Supabase to provide backend storage and API functionality. The integration includes:

1. User management
2. Conversation tracking
3. Message storage and retrieval

## Database Schema

The Supabase database includes the following tables:

- **users**: Stores user information
- **conversations**: Tracks conversations between users
- **messages**: Stores individual messages within conversations

## API Routes

The following API routes have been created:

- `/api/chat/users`: Get all users/contacts
- `/api/chat/conversations`: Get or create conversations
- `/api/chat/messages`: Get or send messages

## Frontend Integration

The frontend components have been updated to use the Supabase API:

- **ContactList.jsx**: Fetches contacts from the API
- **ChatBody.jsx**: Displays messages from the API
- **ChatFooter.jsx**: Sends messages to the API
- **page.jsx**: Initializes conversations when a user is selected

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Supabase Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Use the SQL schema in `Agent/supabase_schema.sql` to set up your database tables
3. Copy your Supabase URL and keys to the `.env.local` file

## Files Modified

- `src/lib/supabaseClient.js` (new)
- `src/services/chatService.js` (new)
- `src/app/api/chat/users/route.js` (new)
- `src/app/api/chat/conversations/route.js` (new)
- `src/app/api/chat/messages/route.js` (new)
- `src/context/reducer/chatReducer.js`
- `src/app/(apps layout)/apps/chat/chats/ContactList.jsx`
- `src/app/(apps layout)/apps/chat/chats/ChatBody.jsx`
- `src/app/(apps layout)/apps/chat/ChatFooter.jsx`
- `src/app/(apps layout)/apps/chat/chats/page.jsx`
- `package.json`
- `.env.local` (new)
