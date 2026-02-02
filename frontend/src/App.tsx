import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Placeholder } from './pages/Placeholder'

/**
 * Router configuration.
 * Defines all application routes with their associated components.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <Placeholder />,
  },
  // Additional routes will be added in future steps:
  // - /auth/login
  // - /auth/register
  // - /chat
  // - /calendar
  // - /tasks
  // - /files
  // - /crm
])

/**
 * Root application component.
 * Sets up React Router and provides global context providers.
 */
export function App() {
  return <RouterProvider router={router} />
}
