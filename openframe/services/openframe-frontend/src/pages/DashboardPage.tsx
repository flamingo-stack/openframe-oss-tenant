import React from 'react';
import { Card } from '@flamingo/ui-kit/components/ui';
import { Button } from '@flamingo/ui-kit/components/ui';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">OpenFrame Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your system architecture overview</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Platforms</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground text-xl">🖥️</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">✗</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Updates</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🔄</span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">System Architecture</h2>
            <Button>Add Platform</Button>
          </div>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold mb-2">No Platforms Found</h3>
            <p className="text-muted-foreground">Add a platform to get started with OpenFrame.</p>
          </div>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Devices</h3>
            <p className="text-muted-foreground mb-4">Manage your devices across all platforms</p>
            <Button variant="outline" className="w-full">
              View Devices
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Monitoring</h3>
            <p className="text-muted-foreground mb-4">Monitor system health and performance</p>
            <Button variant="outline" className="w-full">
              View Monitoring
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Tools</h3>
            <p className="text-muted-foreground mb-4">Manage integrated tools and services</p>
            <Button variant="outline" className="w-full">
              View Tools
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};