# HirePrep Frontend - Project Structure

## 📁 Folder Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.jsx         # Custom button component
│   │   ├── Card.jsx           # Card container component
│   │   ├── Container.jsx      # Layout container
│   │   ├── StarRating.jsx     # Star rating component
│   │   └── index.js           # Export all UI components
│   ├── layout/                # Layout components
│   │   ├── Header.jsx         # Navigation header
│   │   ├── Layout.jsx         # Main layout wrapper
│   │   └── index.js           # Export layout components
│   ├── HeroSection.jsx        # Landing page hero section
│   └── FeaturesSection.jsx    # Landing page features section
├── pages/                     # Page components
│   ├── Home.jsx               # Landing/home page
│   ├── About.jsx              # About page
│   ├── Features.jsx           # Features page
│   ├── Contact.jsx            # Contact page
│   └── index.js               # Export all pages
├── hooks/                     # Custom React hooks
│   ├── useLocalStorage.js     # Local storage hook
│   ├── useApi.js              # API data fetching hook
│   ├── useDebounce.js         # Debounce hook
│   └── index.js               # Export all hooks
├── context/                   # React context providers
│   └── AppContext.jsx         # Global app state context
├── utils/                     # Utility functions
│   └── helpers.js             # Helper functions
├── services/                  # API services
│   └── api.js                 # API service functions
├── assets/                    # Static assets (images, icons, etc.)
├── App.jsx                    # Main app component
├── main.jsx                   # React entry point
└── index.css                  # Global styles with Tailwind
```

## 🧩 Components Architecture

### UI Components (`components/ui/`)
- **Button**: Customizable button with variants (primary, secondary, outline) and sizes
- **Card**: Flexible card container with different variants (default, dark, gray, blue)
- **Container**: Responsive container for consistent max-width and padding
- **StarRating**: Star rating display component with configurable rating and reviews

### Layout Components (`components/layout/`)
- **Header**: Navigation bar with logo, menu items, and signup button
- **Layout**: Main layout wrapper that includes header and provides consistent structure

### Page-Specific Components
- **HeroSection**: Landing page hero with title, CTA buttons, and rating
- **FeaturesSection**: Features grid with statistics and feature cards

## 📄 Pages

### Home (`pages/Home.jsx`)
- Landing page combining HeroSection and FeaturesSection
- Showcases main value proposition and key features

### About (`pages/About.jsx`)
- Company information and value propositions
- Separate sections for candidates and employers

### Features (`pages/Features.jsx`)
- Detailed feature showcase with cards
- Comprehensive list of platform capabilities

### Contact (`pages/Contact.jsx`)
- Contact form with validation
- Contact information and support hours

## 🎣 Custom Hooks

### useLocalStorage
- Persistent local storage state management
- Automatic JSON serialization/deserialization
- Error handling for storage operations

### useApi
- Generic API data fetching hook
- Loading, error, and data states
- Refetch functionality

### useDebounce
- Debounced value updates
- Useful for search inputs and API calls

## 🌐 State Management

### AppContext
- Global application state using React Context + useReducer
- Manages user authentication, theme, notifications, and loading states
- Provides actions for state updates

## 🛠 Utilities & Services

### Helper Functions (`utils/helpers.js`)
- Class name utility for conditional styling
- Date formatting, text manipulation
- Validation functions (email, phone)

### API Services (`services/api.js`)
- Centralized API configuration
- Generic request methods (GET, POST, PUT, DELETE)
- Specific API endpoints for interviews and user management

## 🎨 Styling Strategy

- **Tailwind CSS**: Utility-first CSS framework
- **Component-based styling**: Each component handles its own styles
- **Variant system**: Flexible component variants using props
- **Responsive design**: Mobile-first responsive utilities

## 📦 Export Pattern

Each folder includes an `index.js` file for clean imports:

```javascript
// Instead of:
import Button from './components/ui/Button'
import Card from './components/ui/Card'

// Use:
import { Button, Card } from './components/ui'
```

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

## 🔧 Development Guidelines

1. **Component Organization**: Keep components small and focused
2. **Props Interface**: Use consistent prop naming and validation
3. **State Management**: Use local state for component-specific data, context for global state
4. **Styling**: Prefer Tailwind utilities, create custom components for repeated patterns
5. **Import Organization**: Use barrel exports (index.js files) for cleaner imports