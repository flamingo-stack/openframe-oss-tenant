import { Outlet } from 'react-router-dom';

export const MDMLayout = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-ods-text-primary mb-6">MDM Module</h1>
    <div className="bg-ods-card rounded-lg border border-ods-border">
      <Outlet />
    </div>
  </div>
);
