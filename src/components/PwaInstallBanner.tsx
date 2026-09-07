import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

const DISMISSED_KEY = 'fn_pwa_banner_dismissed_at';

export const PwaInstallBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [slideAnim] = useState(new Animated.Value(60));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // 1. Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed banner recently (within 4 days)
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < 4 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent || '';
    const isAppleMobile =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    setIsIos(isAppleMobile);

    // 4. Chrome / Edge / Android install prompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      showBanner();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // On iOS Safari, show after a short 2.5s delay so the user first sees the app
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isAppleMobile) {
      timer = setTimeout(() => {
        showBanner();
      }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const showBanner = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 80,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISSED_KEY, Date.now().toString());
      } catch {}
    });
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
    }
  };

  if (!visible || Platform.OS !== 'web') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={16} color={colors.charcoal} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>INSTALL FIELDS APP</Text>
            {isIos ? (
              <Text style={styles.instruction}>
                Tap <Ionicons name="share-outline" size={13} color={colors.charcoal} /> then{' '}
                <Text style={styles.boldText}>"Add to Home Screen"</Text> for full-screen offline access.
              </Text>
            ) : (
              <Text style={styles.instruction}>
                Install Fields on your home screen for quick offline access and standalone mode.
              </Text>
            )}
          </View>

          {/* Action or Close */}
          <View style={styles.actions}>
            {deferredPrompt && !isIos && (
              <Pressable
                onPress={handleInstallClick}
                style={({ pressed }) => [styles.installBtn, pressed && styles.pressed]}
              >
                <Text style={styles.installBtnText}>INSTALL</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Dismiss install banner"
            >
              <Ionicons name="close" size={18} color={colors.inkSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1917',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0E7D8',
    borderWidth: 1,
    borderColor: '#D8CEBE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#1C1917',
    marginBottom: 2,
  },
  instruction: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#57534E',
    lineHeight: 15,
  },
  boldText: {
    fontWeight: '700',
    color: '#1C1917',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installBtn: {
    backgroundColor: '#1C1917',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  installBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#FAF8F5',
  },
  pressed: {
    opacity: 0.8,
  },
  closeBtn: {
    padding: 4,
  },
});
