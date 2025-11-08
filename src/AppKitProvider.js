import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { bsc, avalancheFuji as _avalancheFuji } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { useEffect } from 'react';
import { patchTelegramWebView } from './telegram-bridge';
/* 0) query client */
const queryClient = new QueryClient();

/* 1) WalletConnect / Reown project id (CRA or Vite) */
const projectId =
  process.env.REACT_APP_PROJECT_ID ||
  (typeof import.meta !== 'undefined' ? import.meta.env.VITE_WC_PROJECT_ID : undefined);

if (!projectId) {
  // eslint-disable-next-line no-console
  console.warn('Reown/WalletConnect projectId is missing. Set REACT_APP_PROJECT_ID or VITE_WC_PROJECT_ID.');
}

console.log('Project ID:', projectId);

/* 2) App metadata (mobile-friendly) */
const metadata = {
  name: 'Eonx App',
  description: 'Eonx - The Intelligent Currency',
  url: 'https://mini.eonx.ai', // your public site (optional, used for dapp identity)
  icons: ['https://mini.eonx.ai/favicon.ico'],
  redirect: {
    // both can be the same t.me deep link; wallets will use one or the other
    native: 'https://t.me/eonx_cbp_bot?startapp=resume',
    universal: 'https://t.me/eonx_cbp_bot?startapp=resume'
  }
};

// Order matters: put BSC first so it's the default in the modal.
const networks = [bsc];

console.log('Initializing Wagmi Adapter with:', projectId, networks);

/* 4) Wagmi adapter with both networks */
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

(async () => {
  await patchTelegramWebView();                  // <-- run this first
})();

/* 5) Create AppKit modal (mobile-optimized) */
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    socials: false,
    email: false,
    swaps: false,
    send: false,
    history: false,
    onramp: false,
  },
  enableNetworkSwitch: true,
  defaultNetwork: bsc,
  // Mobile-optimized wallet configuration
  featuredWalletIds: [
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // Trust Wallet
    '19177a98252e07ddfc9af2083ba8e07ef6276276103a64181d4acb5d67a3c0b8', // WalletConnect
    '21c3a371f72f0057186082edb2ddd43566f7e908508ac3e85373c6d1966ed614'
  ],
  // Mobile-specific configuration
  mobileWallets: [
    {
      id: 'metamask',
      name: 'MetaMask',
      links: {
        native: 'metamask://',
        universal: 'https://metamask.app.link/',
      },
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      links: {
        native: 'trust://',
        universal: 'https://link.trustwallet.com/',
      },
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      links: {
        native: 'rainbow://',
        universal: 'https://rainbow.app/',
      },
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      links: {
        native: 'coinbase://',
        universal: 'https://go.cb-w.com/',
      },
    },
  ],
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#ffffff',
    '--wui-button-text': 'white',
    '--w3m-border-radius-master': '8px',
    '--w3m-font-size-master': '14px',
  },
  // Mobile-specific settings
  mobile: {
    showQRCode: true,
    showDesktop: false,
  },
});

export function AppKitProvider({ children }) {
  // Enhanced mobile wallet handling
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTelegram = window.Telegram?.WebApp;
    
    if (!isMobile && !isTelegram) {
      console.log('Desktop environment, using standard wallet connections');
      return;
    }

    const originalOpen = window.open;
    window.open = (url) => {
      try {
        if (!url) return null;
        let urlString = typeof url === 'string' ? url : url.toString();
        let isHandled = false;
        
        // Handle MetaMask and Trust Wallet only
        if (urlString.startsWith('metamask://')) {
          urlString = urlString.replace('metamask://', 'https://metamask.app.link/');
          isHandled = true;
        } else if (urlString.startsWith('trust://')) {
          urlString = urlString.replace('trust://', 'https://link.trustwallet.com/');
          isHandled = true;
        }
        
        if (isHandled) {
          console.log(`Opening mobile wallet: ${urlString}`);
          
          if (isTelegram) {
            window.Telegram.WebApp.openLink(urlString, { tryInstantView: false });
          } else {
            // For regular mobile browsers
            window.location.href = urlString;
          }
          return null;
        } else {
          // Use original behavior for all other URLs
          return originalOpen.call(window, url);
        }
      } catch (error) {
        console.error(`Failed to open mobile wallet ${url}`, error);
        // Fallback to original behavior
        return originalOpen.call(window, url);
      }
    };
    
    return () => {
      window.open = originalOpen;
    };
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}