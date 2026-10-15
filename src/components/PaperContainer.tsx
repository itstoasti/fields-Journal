import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, ImageBackground } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface PaperContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  disableTopInset?: boolean;
  disableBottomInset?: boolean;
  withTexture?: boolean;
}

export const PaperContainer: React.FC<PaperContainerProps> = ({
  children,
  style,
  contentStyle,
  disableTopInset = false,
  disableBottomInset = false,
  withTexture = true,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: disableTopInset ? 0 : insets.top,
    paddingBottom: disableBottomInset ? 0 : insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View style={[styles.root, containerStyle, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flex: 1,
  },
});
