import { RouterProvider, createBrowserRouter } from 'react-router'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Chat } from './pages/Chat'
import { ProtectedRoute } from './pages/ProtectedRoute'

/**
 * Router configuration.
 * Defines all application routes with their associated components.
 */
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'chat',
        element: <Chat />,
      },
      // Additional routes will be added in future steps:
      // - calendar
      // - tasks
      // - files
      // - settings
    ],
  },
  // Catch-all route - redirect to dashboard
  {
    path: '*',
    element: <Login />,
  },
])

/**
 * Root application component.
 * Sets up React Router and provides global context providers.
 */
export function App() {
  return <RouterProvider router={router} />
}
