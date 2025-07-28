import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-ods-bg">
        <header className="p-4 bg-ods-card border-b border-ods-border">
          <h1 className="text-2xl font-bold text-ods-text-primary">
            OpenFrame Frontend
          </h1>
          <p className="text-ods-text-secondary">
            UI-Kit integration successful! 🎉
          </p>
        </header>
        <main className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-ods-card p-6 rounded-lg border border-ods-border">
              <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
                Clean Slate React App
              </h2>
              <p className="text-ods-text-secondary mb-4">
                This is a fresh React + TypeScript + Vite application with @flamingo/ui-kit integration.
                The design should now be 100% consistent with multi-platform-hub (OpenMSP).
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-ods-accent text-white rounded-md hover:bg-ods-accent-hover">
                  Primary Button
                </button>
                <button className="px-4 py-2 bg-ods-bg-hover text-ods-text-primary border border-ods-border rounded-md hover:bg-ods-bg-active">
                  Secondary Button
                </button>
                <button className="px-4 py-2 border border-ods-border text-ods-text-primary rounded-md hover:bg-ods-bg-hover">
                  Outline Button
                </button>
              </div>
            </div>
            
            <div className="bg-ods-card p-6 rounded-lg border border-ods-border">
              <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
                Design System Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-ods-text-primary mb-2">✅ Completed</h3>
                  <ul className="text-sm text-ods-text-secondary space-y-1">
                    <li>• UI-Kit dependency integration</li>
                    <li>• Tailwind configuration with ODS tokens</li>
                    <li>• Platform-aware theming (openframe)</li>
                    <li>• Clean project structure</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-ods-text-primary mb-2">🔄 Next Steps</h3>
                  <ul className="text-sm text-ods-text-secondary space-y-1">
                    <li>• Authentication system setup</li>
                    <li>• Apollo Client configuration</li>
                    <li>• Router and layout components</li>
                    <li>• Component migration from Vue</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App