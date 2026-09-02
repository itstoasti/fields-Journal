import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const initApp = useAppStore((state) => state.initApp);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const [splashFade] = useState(new Animated.Value(1));
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initApp();
  }, [initApp]);

  useEffect(() => {
    if (isInitialized) {
      const timer = setTimeout(() => {
        Animated.timing(splashFade, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, splashFade]);

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

      {/* High-Resolution In-App Splash Brand Tag */}
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
          <View style={styles.splashCard}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
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
  splashCard: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B2B2B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  splashLogo: {
    width: 220,
    height: 220,
    borderRadius: 28,
  },
});
