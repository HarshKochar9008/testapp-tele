import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { mockTelegramEnv, parseInitDataQuery, retrieveLaunchParams,retrieveRawInitData } from "@telegram-apps/sdk";

// Create Context
const TelegramContext = createContext(null);

// Provider Component
export const TelegramProvider = ({ children }) => {
  const [telegramData, setTelegramData] = useState(null);

  const initializeTelegram = useCallback(() => {
    const isTelegramWebView = typeof window !== "undefined" && window.Telegram?.WebApp?.initData;

    if (process.env.REACT_APP_ENVIRONMENT !== "development" && !isTelegramWebView) {
      window.location.href = "https://t.me/Eonxx_bot";
      return;
    }
    try {
      let initDataRaw = retrieveRawInitData();

      console.log("initDataRaw", initDataRaw);

      // const user = initDataRaw?.tgWebAppData?.user;
      // if (!user) throw new Error("User data not found");

      // console.log("Telegram User Data:", user);
      setTelegramData(initDataRaw);
      // toast.success(`Welcome to Eonx ${user.username}!`);
    } catch (error) {
      console.error("Error initializing Telegram Mini App:", error);

      // Only mock in development mode
      if (process.env.REACT_APP_ENVIRONMENT === "development") {
        console.warn("Running in development mode - initializing mock Telegram environment...");

        const initDataRaw = new URLSearchParams([
          [
            "user",
            JSON.stringify({
              id: parseInt(process.env.REACT_APP_DEBUG_TG_ID),
              first_name: "Spider",
              last_name: "Rogue",
              username: "rogue111",
              language_code: "en",
              is_premium: true,
              allows_write_to_pm: true,
            }),
          ],
          ["hash", "mocked_hash_value"],
          ["auth_date", Date.now().toString()],
          ["signature", "mocked_signature_value"],
        ]).toString();

        mockTelegramEnv({
          themeParams: {
            accentTextColor: "#6ab2f2",
            bgColor: "#17212b",
            buttonColor: "#5288c1",
            buttonTextColor: "#ffffff",
            textColor: "#f5f5f5",
          },
          initData: parseInitDataQuery(initDataRaw),
          initDataRaw,
          version: "7.2",
          platform: "tdesktop",
        });

        console.log("Mock Telegram environment initialized for local testing");
        toast.warn("Mock Telegram environment initialized for local testing");

        // Set mock data
        setTelegramData(initDataRaw);
      } else {
        setTelegramData(null);
        
        toast.error("This app must be run inside Telegram.");
      }
    }
  }, []);

  useEffect(() => {
    initializeTelegram();
  }, [initializeTelegram]);

  return (
    <TelegramContext.Provider value={{ telegramData }}>
      {children}
    </TelegramContext.Provider>
  );
};

// Custom Hook to Access Telegram Data
export const useTelegram = () => {
  return useContext(TelegramContext);
};