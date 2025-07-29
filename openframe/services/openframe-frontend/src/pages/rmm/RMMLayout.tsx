import { Outlet } from 'react-router-dom';

export const RMMLayout = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-ods-text-primary mb-6">RMM Module</h1>
    <div className="bg-ods-card rounded-lg border border-ods-border">
      <Outlet />
    </div>
  </div>
);
