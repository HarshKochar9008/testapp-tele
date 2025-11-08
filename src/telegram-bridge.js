import { isTelegramEnvironment, overrideWindowOpen } from '@bitget-wallet/omni-connect';

export async function patchTelegramWebView() {
  // Skip in debug/development mode to avoid overriding window.open
  if (process.env.REACT_APP_ENVIRONMENT === "development" || process.env.NODE_ENV === "development") {
    console.log("Debug mode: Skipping window.open override");
    return;
  }

  if (await isTelegramEnvironment()) {
    overrideWindowOpen(); // routes WC/Reown deep links via Telegram-safe openLink
  }
}