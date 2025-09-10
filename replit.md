# Overview

This is a full-stack web application built with Express.js backend and React frontend. The application follows a monorepo structure with shared schemas and demonstrates a minimal setup for displaying content. The backend uses Express with PostgreSQL (via Drizzle ORM), while the frontend is built with React, TypeScript, and shadcn/ui components with Tailwind CSS styling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod resolvers for validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Shared schema definitions between client and server
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot reload with tsx for TypeScript execution

## Data Storage
- **Database**: PostgreSQL as the primary database
- **ORM**: Drizzle ORM with Zod integration for runtime validation
- **Connection**: Neon serverless PostgreSQL adapter
- **Migrations**: Drizzle Kit for schema migrations in `/migrations` directory
- **In-Memory Fallback**: MemStorage class for development/testing without database

## Authentication & Authorization
- **Session-based**: Uses express-session with PostgreSQL storage
- **User Model**: Basic user schema with username and password fields
- **Storage Interface**: Abstracted IStorage interface allowing for different storage implementations

## Project Structure
- **Monorepo**: Single repository with client, server, and shared code
- **Client**: React application in `/client` directory
- **Server**: Express API in `/server` directory  
- **Shared**: Common schemas and types in `/shared` directory
- **Build**: Separate build processes - Vite for client, esbuild for server

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **drizzle-kit**: CLI tool for database migrations and schema management

## UI & Styling Dependencies
- **@radix-ui/***: Comprehensive collection of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating type-safe CSS class variants
- **lucide-react**: Icon library with React components

## Development & Build Tools
- **vite**: Fast build tool and development server
- **esbuild**: Fast JavaScript bundler for server builds
- **tsx**: TypeScript execution environment for development
- **@replit/vite-plugin-runtime-error-modal**: Replit-specific development plugin

## Data & Forms
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Performant forms with easy validation
- **zod**: TypeScript-first schema validation
- **date-fns**: Date utility library

## Runtime Environment
- **Replit**: Configured for Replit development environment with specific plugins and error handling
- **Node.js**: ES modules with TypeScript throughout