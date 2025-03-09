import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppProvider>
  );
} 