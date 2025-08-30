import React from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ApiKeySetup } from './components/ApiKeySetup';
import Library from './screens/Library';

interface ApiKeys {
  steamApiKey?: string;
  steamId?: string;
  xboxCredentials?: any;
  gogCredentials?: any;
}

// Setup screen component
function Setup() {
  const handleSubmit = (apiKeys: ApiKeys) => {
    console.log('API Keys submitted:', apiKeys);
    // Navigate to library after successful setup
    window.location.hash = '#/library';
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-auto">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Library Compare</h1>
        <ApiKeySetup onSubmit={handleSubmit} />
      </div>
    </div>
  );
}

// Router configuration
const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/library" replace />
  },
  {
    path: '/setup',
    element: <Setup />
  },
  {
    path: '/library',
    element: <Library />
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;

