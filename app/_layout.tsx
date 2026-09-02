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
      }, 700);
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
          <Image
            source={require('../assets/splash-clean.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
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
  splashLogo: {
    width: 250,
    height: 250,
  },
});
