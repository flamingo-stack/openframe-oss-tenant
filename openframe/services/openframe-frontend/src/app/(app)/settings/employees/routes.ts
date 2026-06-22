// Shared by the employees table (row link / open-in-new-tab) and the header
// profile menu — keep the route in one place so every entry point stays in sync.
export const employeeDetailHref = (id: string) => `/settings/employees/details/${id}`;
