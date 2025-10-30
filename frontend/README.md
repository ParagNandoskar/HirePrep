# HirePrep Frontend

A modern React application for AI-powered mock interviews and smarter hiring solutions.

## 🚀 Tech Stack

- **React 18** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript** - ES6+ modern JavaScript

## 📋 Features

- **Landing Page** - Professional landing page with hero section and features
- **Multi-page Structure** - Home, About, Features, and Contact pages
- **Reusable Components** - Well-organized component library
- **Custom Hooks** - Utility hooks for common functionality
- **State Management** - React Context for global state
- **Responsive Design** - Mobile-first responsive layout
- **API Integration** - Ready-to-use API service layer

## 🏗 Project Structure

```
src/
├── components/        # Reusable components
│   ├── ui/           # UI components (Button, Card, etc.)
│   └── layout/       # Layout components (Header, Layout)
├── pages/            # Page components
├── hooks/            # Custom React hooks
├── context/          # React context providers
├── utils/            # Utility functions
├── services/         # API services
└── assets/           # Static assets
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed architecture documentation.

## 🚀 Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Start development server**
```bash
npm run dev
```

3. **Build for production**
```bash
npm run build
```

4. **Preview production build**
```bash
npm run preview
```

## 🎨 Component Usage Examples

### Button Component
```jsx
import { Button } from './components/ui'

<Button variant="primary" size="lg">Get Started</Button>
<Button variant="secondary">Learn More</Button>
```

### Card Component
```jsx
import { Card } from './components/ui'

<Card variant="dark">
  <h3>Feature Title</h3>
  <p>Feature description</p>
</Card>
```

### Using Custom Hooks
```jsx
import { useLocalStorage, useApi } from './hooks'

const [user, setUser] = useLocalStorage('user', null)
const { data, loading, error } = useApi('/api/interviews')
```

## 🌐 Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 📱 Pages

- **Home (`/`)** - Landing page with hero section and features
- **About (`/about`)** - Company information and value propositions  
- **Features (`/features`)** - Detailed feature showcase
- **Contact (`/contact`)** - Contact form and information

## 🔧 Development

### Adding New Components
1. Create component in appropriate folder (`components/ui/` or `components/`)
2. Export from folder's `index.js` file
3. Import using barrel exports: `import { ComponentName } from './components/ui'`

### State Management
- Use `useState` for local component state
- Use `AppContext` for global state (user, theme, notifications)
- Custom hooks for reusable stateful logic

### Styling Guidelines
- Use Tailwind CSS utility classes
- Create component variants using props
- Keep responsive design mobile-first
- Use consistent spacing and color schemes

## 📦 Build & Deploy

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

Built files will be in the `dist/` folder, ready for deployment to any static hosting service.

## 🤝 Contributing

1. Follow the established folder structure
2. Use consistent component patterns
3. Add proper TypeScript types (if converting to TS)
4. Test components before submitting
5. Update documentation for new features
