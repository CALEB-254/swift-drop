# Welcome to your SwiftDrop project

## Project info

A modern delivery management system built with React, TypeScript, and Supabase.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

If you're using Lovable to manage this project, visit your Lovable workspace and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd swift-drop

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create a .env file with your Supabase credentials.
# Copy .env.example and add your actual Supabase project details
cp .env.example .env

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Vite** - Lightning-fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - Modern UI library
- **shadcn-ui** - High-quality UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Open-source Firebase alternative
- **React Query** - Data synchronization library
- **React Hook Form** - Performant form handling
- **Zod** - Schema validation

## Features

- 📦 Multi-user delivery tracking system
- 🔐 Secure authentication with Supabase
- 👥 Support for Senders, Agents, and Admins
- 📊 Comprehensive dashboards for each user role
- 🎨 Modern, responsive UI with Tailwind CSS
- ✅ Form validation with Zod

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_PROJECT_ID=your_project_id_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
VITE_SUPABASE_URL=https://your_project_id_here.supabase.co
```

Never commit the `.env` file with real credentials. Use `.env.example` for template purposes.

## Development

```sh
# Run development server
npm run dev

# Build for production
npm run build

# Build with development mode
npm run build:dev

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Run tests
npm run test

# Watch tests
npm run test:watch
```

## License

This project is private. Contact the repository owner for more information.