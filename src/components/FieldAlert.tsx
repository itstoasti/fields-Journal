import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, layout, spacing } from '../theme';
import { TypewriterText } from './TypewriterText';
import { StampButton } from './StampButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface FieldAlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  isPreferred?: boolean;
}

export interface FieldAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  badge?: string;
  badgeVariant?: 'notice' | 'warning' | 'success';
}

export interface FieldAlertConfig {
  title: string;
  message?: string;
  buttons?: FieldAlertButton[];
  badge?: string;
  badgeVariant?: 'notice' | 'warning' | 'success';
  cancelable?: boolean;
}

type Listener = (config: FieldAlertConfig | null) => void;
let alertListeners: Listener[] = [];
let currentAlert: FieldAlertConfig | null = null;

export const FieldAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: FieldAlertButton[],
    options?: FieldAlertOptions
  ) => {
    // If no buttons passed, default to single "OK" button
    const resolvedButtons: FieldAlertButton[] =
      buttons && buttons.length > 0
        ? buttons.map((b) => ({ ...b, text: b.text || 'OK' }))
        : [{ text: 'OK', style: 'default' }];

    // Auto-detect badge if not provided
    let badge = options?.badge;
    let badgeVariant = options?.badgeVariant || 'notice';

    if (!badge) {
      const lowerTitle = (title || '').toLowerCase();
      if (
        lowerTitle.includes('error') ||
        lowerTitle.includes('fail') ||
        lowerTitle.includes('required')
      ) {
        badge = '⚠ NOTICE';
        badgeVariant = 'warning';
      } else if (
        lowerTitle.includes('synced') ||
        lowerTitle.includes('verified') ||
        lowerTitle.includes('unlocked') ||
        lowerTitle.includes('restored') ||
        lowerTitle.includes('saved') ||
        lowerTitle.includes('linked') ||
        lowerTitle.includes('thank')
      ) {
        badge = '✦ VERIFIED ✦';
        badgeVariant = 'success';
      } else if (
        lowerTitle.includes('delete') ||
        lowerTitle.includes('clear') ||
        lowerTitle.includes('remove')
      ) {
        badge = '⚠ PERMANENT ACTION';
        badgeVariant = 'warning';
      } else {
        badge = '✦ FIELD NOTICE ✦';
        badgeVariant = 'notice';
      }
    }

    currentAlert = {
      title,
      message,
      buttons: resolvedButtons,
      badge,
      badgeVariant,
      cancelable: options?.cancelable ?? true,
    };

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    alertListeners.forEach((fn) => fn(currentAlert));
  },

  dismiss: () => {
    currentAlert = null;
    alertListeners.forEach((fn) => fn(null));
  },
};

/**
 * Global Host Component to render FieldAlert over any screen.
 * Mounted in app/_layout.tsx at the application root.
 */
export const FieldAlertHost: React.FC = () => {
  const [config, setConfig] = useState<FieldAlertConfig | null>(currentAlert);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    const listener: Listener = (newConfig) => {
      if (newConfig) {
        setConfig(newConfig);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.94,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setConfig(null);
        });
      }
    };

    alertListeners.push(listener);
    return () => {
      alertListeners = alertListeners.filter((fn) => fn !== listener);
    };
  }, [fadeAnim, scaleAnim]);

  if (!config) return null;

  const handleButtonPress = (btn: FieldAlertButton) => {
    FieldAlert.dismiss();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const getButtonVariant = (btn: FieldAlertButton, index: number, total: number) => {
    if (btn.style === 'destructive') return 'danger' as const;
    if (btn.style === 'cancel') return 'secondary' as const;
    if (total === 2) {
      return index === 1 ? ('primary' as const) : ('secondary' as const);
    }
    return index === 0 ? ('primary' as const) : ('secondary' as const);
  };

  const hasBulletsOrLines = config.message && (config.message.includes('\n') || config.message.includes('•'));

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => {
          if (config.cancelable === false) return;
          // If there is a cancel button, trigger it on outside click
          const cancelBtn = config.buttons?.find((b) => b.style === 'cancel');
          if (cancelBtn) {
            handleButtonPress(cancelBtn);
          } else if (config.buttons?.length === 1) {
            handleButtonPress(config.buttons[0]);
          }
        }}
      />

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Stamp Seal Badge */}
          {config.badge && (
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgePill,
                  config.badgeVariant === 'warning'
                    ? styles.badgeWarning
                    : config.badgeVariant === 'success'
                    ? styles.badgeSuccess
                    : styles.badgeNotice,
                ]}
              >
                <TypewriterText
                  size="xs"
                  bold
                  color={
                    config.badgeVariant === 'warning'
                      ? colors.oxblood
                      : config.badgeVariant === 'success'
                      ? colors.deepGreen
                      : colors.charcoal
                  }
                  letterSpacing={1.2}
                >
                  {config.badge}
                </TypewriterText>
              </View>
            </View>
          )}

          {/* Title */}
          <TypewriterText
            size="md"
            bold
            color={colors.charcoal}
            letterSpacing={1.5}
            style={styles.title}
          >
            {config.title.toUpperCase()}
          </TypewriterText>

          {/* Message */}
          {config.message && (
            hasBulletsOrLines ? (
              <View style={styles.boxedMessageBox}>
                <TypewriterText size="xs" color={colors.inkSecondary} style={styles.boxedMessageText}>
                  {config.message}
                </TypewriterText>
              </View>
            ) : (
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.messageText}>
                {config.message}
              </TypewriterText>
            )
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {config.buttons && config.buttons.length === 1 && (
            <StampButton
              title={config.buttons[0].text || 'OK'}
              onPress={() => handleButtonPress(config.buttons![0])}
              variant={config.buttons[0].style === 'destructive' ? 'danger' : 'primary'}
              style={styles.singleBtn}
            />
          )}

          {config.buttons && config.buttons.length === 2 && (
            <View style={styles.buttonsRow}>
              <StampButton
                title={config.buttons[0].text || 'OK'}
                onPress={() => handleButtonPress(config.buttons![0])}
                variant={getButtonVariant(config.buttons[0], 0, 2)}
                style={styles.halfBtn}
              />
              <StampButton
                title={config.buttons[1].text || 'OK'}
                onPress={() => handleButtonPress(config.buttons![1])}
                variant={getButtonVariant(config.buttons[1], 1, 2)}
                style={styles.halfBtn}
              />
            </View>
          )}

          {config.buttons && config.buttons.length > 2 && (
            <View style={styles.buttonsCol}>
              {config.buttons.map((btn, index) => (
                <StampButton
                  key={index}
                  title={btn.text || 'OK'}
                  onPress={() => handleButtonPress(btn)}
                  variant={getButtonVariant(btn, index, config.buttons!.length)}
                  style={styles.stackedBtn}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - spacing.xl * 2, 340),
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.charcoal,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 16,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeNotice: {
    backgroundColor: '#E5DFC9',
    borderColor: '#D0C4AF',
  },
  badgeSuccess: {
    backgroundColor: '#E3EDE6',
    borderColor: '#C6DDD0',
  },
  badgeWarning: {
    backgroundColor: '#F7EBE8',
    borderColor: '#E8CFC9',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  messageText: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  boxedMessageBox: {
    backgroundColor: colors.paperDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  boxedMessageText: {
    lineHeight: 19,
  },
  cardScroll: {
    maxHeight: SCREEN_HEIGHT * 0.52,
  },
  cardScrollContent: {
    paddingVertical: spacing.xs,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: spacing.xs,
  },
  singleBtn: {
    minHeight: 46,
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  halfBtn: {
    flex: 1,
    minHeight: 46,
  },
  buttonsCol: {
    gap: spacing.xs,
    width: '100%',
  },
  stackedBtn: {
    minHeight: 44,
    width: '100%',
  },
});
