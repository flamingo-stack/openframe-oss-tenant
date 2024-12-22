interface Environment {
  apiUrl: string;
}

const environment: Environment = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8090'
};

export default environment; 