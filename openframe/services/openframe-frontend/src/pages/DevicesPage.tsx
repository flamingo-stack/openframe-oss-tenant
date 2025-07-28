import React from 'react';
import { Card } from '@flamingo/ui-kit/components/ui';

export const DevicesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Devices</h1>
        
        <Card className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-semibold mb-2">Devices Page</h3>
            <p className="text-muted-foreground">Device management functionality will be implemented here.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};