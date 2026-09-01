import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const initApp = useAppStore((state) => state.initApp);

  useEffect(() => {
    initApp();
  }, [initApp]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="compose" />
        <Stack.Screen name="pressing" />
        <Stack.Screen name="result" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy" />
        <Stack.Screen
          name="modal/paywall"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="modal/privacy-consent"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}
