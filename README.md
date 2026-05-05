# Certificate IV in Real Estate Practice - Content Management & Export System

This application allows administrators to manage course content for the Certificate IV in Real Estate Practice across multiple Australian states and enables trainers to export customized Learner and Assessor Guides as PDFs.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide React, dnd-kit, pdf-lib
- **Backend**: Node.js, Express, Knex.js
- **Database**: SQLite3

## Features
- **CMS**: Create and edit Units, Topics, and Sections with a Rich Text Editor.
- **Content Selector**: Browse content by State and Guide Type (Learner/Assessor).
- **Selection Cart**: Drag-and-drop to reorder selected sections.
- **PDF Export**: Generate a combined PDF with cover page, TOC, and page numbers.
- **Dark Mode**: Support for light and dark themes.
- **Version Control**: Track history of content changes.

## Running Locally

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Setup Database
```bash
cd server
npx knex migrate:latest
npx knex seed:run
```

### 3. Start the Application
Run these in separate terminals:

**Server:**
```bash
cd server
npm start
```

**Client:**
```bash
cd client
npm run dev
```

## Demo Credentials
- **Admin**: `admin` / `password123`
- **Trainer**: `trainer` / `password123`
