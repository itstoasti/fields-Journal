import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/useAppStore';
import { TypewriterText, PwaInstallBanner } from '../src/components';
import { colors, spacing } from '../src/theme';

export default function RootLayout() {
  const initApp = useAppStore((state) => state.initApp);
  const [splashFade] = useState(new Animated.Value(1));
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Run background app initialization
    initApp();

    // Register PWA Service Worker on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] ServiceWorker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('[SW] ServiceWorker registration failed:', err);
          });
      });
    }

    // Guaranteed splash dismissal after 1.0s max, never blocks user UI
    const timer = setTimeout(() => {
      Animated.timing(splashFade, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [initApp, splashFade]);

  return (
    <View style={styles.root}>
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

      {/* PWA iOS Add to Home Screen & Install Prompt */}
      <PwaInstallBanner />

      {/* Seamless High-Resolution In-App Splash Brand Tag */}
      {showSplash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashContainer,
            {
              opacity: splashFade,
            },
          ]}
        >
          <View style={styles.splashContent}>
            <Image
              source={require('../assets/tag-transparent.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
            <TypewriterText
              size="xs"
              bold
              letterSpacing={2.5}
              color={colors.inkSecondary}
              style={styles.splashSubtitle}
            >
              TRAVEL JOURNAL & SCRAPBOOK
            </TypewriterText>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 240,
    height: 240,
  },
  splashSubtitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
