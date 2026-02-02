/**
 * Placeholder page component.
 * Used as a temporary landing page to verify the frontend is working.
 * This will be replaced with the actual home page in a future step.
 */
export function Placeholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <svg
                className="w-10 h-10 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Smart Office AI
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            All-in-one AI-powered office suite for self-hosting
          </p>
          <div className="bg-muted rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">Status</h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                React + TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Vite + HMR
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Tailwind CSS
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                React Router
              </li>
            </ul>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Step 5: Frontend Foundation Complete</p>
            <p className="mt-1">More features coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
