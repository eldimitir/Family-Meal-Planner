import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GOOGLE_SHEETS_CONFIG } from '../constants';

declare global {
  interface Window {
    gapi: any;
    gapiClientLoaded?: boolean;
  }
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY?: string;
    }
  }
}

interface GoogleSheetsApiContextType {
  gapiClient: any | null;
  isGapiReady: boolean;
  gapiError: Error | null;
  isLoadingGapi: boolean;
}

const GoogleSheetsApiContext = createContext<GoogleSheetsApiContextType | undefined>(undefined);

export const GoogleSheetsApiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gapiClient, setGapiClient] = useState<any | null>(null);
  const [isGapiReady, setIsGapiReady] = useState<boolean>(false);
  const [gapiError, setGapiError] = useState<Error | null>(null);
  const [isLoadingGapi, setIsLoadingGapi] = useState<boolean>(true);

  useEffect(() => {
    const API_KEY = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    const SPREADSHEET_ID = GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID;

    if (!API_KEY) {
      console.error("API_KEY is not defined. Please ensure it's set in process.env.API_KEY.");
      setGapiError(new Error("API_KEY is not defined."));
      setIsLoadingGapi(false);
      setIsGapiReady(false);
      return;
    }
     if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      console.error("SPREADSHEET_ID is not configured. Please set it in constants.ts.");
      setGapiError(new Error("SPREADSHEET_ID is not configured."));
      setIsLoadingGapi(false);
      setIsGapiReady(false);
      return;
    }


    const initClient = () => {
      window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
      }).then(() => {
        setGapiClient(window.gapi.client);
        setIsGapiReady(true);
        setGapiError(null);
        setIsLoadingGapi(false);
      }).catch((error: any) => {
        console.error("Error initializing Google API client:", error);
        setGapiError(new Error(`Failed to initialize Google API client: ${error.message || error.details || JSON.stringify(error)}`));
        setIsGapiReady(false);
        setIsLoadingGapi(false);
      });
    };

    const loadClient = () => {
      if (window.gapi && window.gapi.load) {
        window.gapi.load('client', initClient);
      } else if (window.gapiClientLoaded) { // Fallback if script loaded but gapi.load not immediately available
         // Ensure gapi.client is available or wait a bit longer
        if (window.gapi && window.gapi.load) {
            window.gapi.load('client', initClient);
        } else {
            // If gapi.load is still not there, it's an issue.
            console.error("gapi.load not available after script load.");
            setGapiError(new Error("gapi.load not available."));
            setIsLoadingGapi(false);
        }
      } else {
        // Script not loaded yet, wait for it
        const interval = setInterval(() => {
          if (window.gapiClientLoaded && window.gapi && window.gapi.load) {
            clearInterval(interval);
            window.gapi.load('client', initClient);
          } else if (document.readyState === 'complete' && !window.gapiClientLoaded) {
            // If document is complete and script hasn't set the flag, something is wrong
            clearInterval(interval);
            console.error("Google API script failed to load or `gapiClientLoaded` was not set.");
            setGapiError(new Error("Google API script failed to load."));
            setIsLoadingGapi(false);
          }
        }, 100);
        // Safety timeout
        setTimeout(() => {
            if (!isGapiReady && isLoadingGapi) {
                clearInterval(interval);
                console.error("Timeout waiting for Google API script.");
                setGapiError(new Error("Timeout waiting for Google API script."));
                setIsLoadingGapi(false);
            }
        }, 10000); // 10 seconds timeout
      }
    };
    
    loadClient();

  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <GoogleSheetsApiContext.Provider value={{ gapiClient, isGapiReady, gapiError, isLoadingGapi }}>
      {children}
    </GoogleSheetsApiContext.Provider>
  );
};

export const useGoogleSheetsApi = (): GoogleSheetsApiContextType => {
  const context = useContext(GoogleSheetsApiContext);
  if (context === undefined) {
    throw new Error('useGoogleSheetsApi must be used within a GoogleSheetsApiProvider');
  }
  return context;
};
