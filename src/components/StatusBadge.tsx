import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { TypewriterText } from './TypewriterText';
import { colors, spacing } from '../theme';
import { UserEntitlementState } from '../types';

interface StatusBadgeProps {
  entitlements: UserEntitlementState;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  entitlements,
  style,
}) => {
  const getStatusText = (): string => {
    const { freeUsed, adUsed, credits } = entitlements;

    if (freeUsed === 0) {
      return '2 free notes left';
    } else if (freeUsed === 1) {
      return '1 free note left';
    } else if (freeUsed >= 2 && !adUsed) {
      return 'Last free note needs a video';
    } else if (credits > 0) {
      return `${credits} ${credits === 1 ? 'note' : 'notes'} remaining`;
    } else {
      return '0 notes left';
    }
  };

  return (
    <View style={[styles.pillContainer, style]}>
      <TypewriterText size="sm" color={colors.pillText} bold letterSpacing={0.5}>
        {getStatusText()}
      </TypewriterText>
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    backgroundColor: colors.pillBackground,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
    alignSelf: 'center',
  },
});
