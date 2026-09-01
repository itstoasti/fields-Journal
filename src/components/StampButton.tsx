import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSizes, spacing } from '../theme';

interface StampButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const StampButton: React.FC<StampButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let base: ViewStyle = {
      minHeight: 54,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
    };

    if (variant === 'primary') {
      return {
        ...base,
        backgroundColor: colors.charcoal,
      };
    } else if (variant === 'secondary') {
      return {
        ...base,
        backgroundColor: colors.paperCard,
        borderWidth: 1.5,
        borderColor: colors.charcoal,
      };
    } else if (variant === 'danger') {
      return {
        ...base,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.error,
      };
    } else {
      // ghost
      return {
        ...base,
        backgroundColor: 'transparent',
      };
    }
  };

  const getTextColor = (): string => {
    if (variant === 'primary') return colors.paper;
    if (variant === 'danger') return colors.error;
    if (variant === 'ghost') return colors.inkSecondary;
    return colors.charcoal;
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.paper : colors.charcoal}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    fontFamily: fonts.mono,
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
