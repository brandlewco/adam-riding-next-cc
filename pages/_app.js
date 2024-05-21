import '../styles/globals.css';
import {CloudCannonConnect} from '@cloudcannon/react-connector';
import { useEffect } from 'react';
import useStore from '../lib/store';

export default function App({ Component, pageProps }) {
  const AppComponent = CloudCannonConnect(Component, {
    valueOptions: {
      keepMarkdownAsHTML: false
    }
  });

  const setInitialLoad = useStore(state => state.setInitialLoad);

  useEffect(() => {
    const hasNavigated = sessionStorage.getItem('hasNavigated');
    if (hasNavigated) {
      setInitialLoad(false);
    } else {
      sessionStorage.setItem('hasNavigated', 'true');
      setInitialLoad(true);
    }
  }, [setInitialLoad]);

  return <AppComponent {...pageProps} />;
}
