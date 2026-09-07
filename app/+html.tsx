import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

// This file is web-only and configures the root HTML document for the Expo Router web build.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        <title>Fields — Travel Journal & Scrapbook</title>
        <meta
          name="description"
          content="Transform your travel photographs into timeless carved stamp prints, vintage travel posters, and field note memories."
        />

        {/* PWA Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F4EFE6" />

        {/* Apple iOS Web App Meta & Icons */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Fields" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />

        {/* Standard Favicons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        {/* Fonts Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />

        {/* Reset styles for react-native-web */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100%;
                background-color: #F4EFE6;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
                -webkit-tap-highlight-color: transparent;
              }
              body {
                overflow-x: hidden;
              }
              #root {
                display: flex;
                min-height: 100%;
                width: 100%;
                background-color: #F4EFE6;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
