import { routes } from '@/lib/routes';

// Shared by the employees table (row link / open-in-new-tab) and the header
// profile menu — kept as a thin alias over the central registry so every entry
// point stays in sync.
export const employeeDetailHref = (id: string) => routes.settings.employeeDetails(id);
