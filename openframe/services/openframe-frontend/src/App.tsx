import { RouterProvider } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { router } from '@/lib/router';
import { apolloClient } from '@/lib/apollo';

export const App = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  );
};

export default App;