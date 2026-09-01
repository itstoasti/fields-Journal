import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PaperContainer,
  TypewriterText,
  StampButton,
  PhotoTape,
} from '../src/components';
import { colors, fonts, fontSizes, spacing } from '../src/theme';
import { useAppStore } from '../src/store/useAppStore';
import { rewardedAdManager } from '../src/lib/ads';
import { pickImageFromLibrary, pickImageFromCamera } from '../src/lib/picker';
import { extractPhotoMetadata } from '../src/lib/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string }>();
  const getNextNoteNumber = useAppStore((state) => state.getNextNoteNumber);
  const hasConsentedPrivacy = useAppStore((state) => state.hasConsentedPrivacy);
  const getEntitlementType = useAppStore((state) => state.getEntitlementType);

  // Form states: starts empty so user provides their own photo
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(
    params.photoUri || null
  );
  const [place, setPlace] = useState<string>('');
  const [noteNumber, setNoteNumber] = useState<string>(getNextNoteNumber());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [keywordsText, setKeywordsText] = useState<string>('');
  const [isAdLoading, setIsAdLoading] = useState<boolean>(false);
  const [autoDetectedNotice, setAutoDetectedNotice] = useState<string | null>(null);

  // Preload rewarded ad if on ad step
  const currentEntitlement = getEntitlementType();
  useEffect(() => {
    if (currentEntitlement === 'ad') {
      rewardedAdManager.preloadAd();
    }
  }, [currentEntitlement]);

  const applyExtractedMetadata = async (result: {
    uri?: string;
    exif?: Record<string, any>;
    location?: { latitude: number; longitude: number };
    creationTime?: number;
    metadataUnavailable?: boolean;
  }) => {
    try {
      const meta = await extractPhotoMetadata({
        uri: result.uri,
        exif: result.exif,
        location: result.location,
        creationTime: result.creationTime,
      });

      setPlace(meta.place || '');
      if (meta.year) {
        setYear(meta.year);
      }
      setKeywordsText(meta.keywords && meta.keywords.length > 0 ? meta.keywords.join(' · ') : '');

      if (meta.place || meta.year) {
        setAutoDetectedNotice(
          meta.place ? `Auto-detected: ${meta.place}` : `Auto-detected year: ${meta.year}`
        );
        setTimeout(() => setAutoDetectedNotice(null), 4000);
      }
    } catch (e) {
      console.warn('[Compose] Metadata extraction error:', e);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const result = await pickImageFromLibrary();
      if (!result.canceled && result.uri) {
        setSelectedPhotoUri(result.uri);
        await applyExtractedMetadata(result);
      }
    } catch (error: any) {
      Alert.alert('Photo Picker', error.message || 'Could not select photo.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await pickImageFromCamera();
      if (!result.canceled && result.uri) {
        setSelectedPhotoUri(result.uri);
        await applyExtractedMetadata(result);
      }
    } catch (error: any) {
      Alert.alert('Camera', error.message || 'Could not open camera.');
    }
  };

  const parseKeywords = (): [string, string, string] => {
    const parts = keywordsText.split(/[·,\n|]/).map((s) => s.trim()).filter(Boolean);
    return [
      parts[0] || '',
      parts[1] || '',
      parts[2] || '',
    ];
  };

  const executeProceedToPressing = (entitlementType: 'free' | 'ad' | 'credit') => {
    if (!selectedPhotoUri) return;
    const [k1, k2, k3] = parseKeywords();

    router.push({
      pathname: '/pressing',
      params: {
        photoUri: selectedPhotoUri,
        place: place.trim(),
        number: noteNumber.trim() || '01',
        keyword1: k1,
        keyword2: k2,
        keyword3: k3,
        year: year.trim() || new Date().getFullYear().toString(),
        entitlement: entitlementType,
      },
    });
  };

  const handlePressAction = async () => {
    if (!selectedPhotoUri) {
      Alert.alert('Photo Required', 'Please select a photo from your library or camera first.');
      return;
    }

    // Step 1: Check First-run Privacy Consent
    if (!hasConsentedPrivacy) {
      router.push('/modal/privacy-consent');
      return;
    }

    const entitlement = getEntitlementType();

    // Step 2: Handle Paywall
    if (entitlement === 'paywall') {
      router.push('/modal/paywall');
      return;
    }

    // Step 3: Handle Note 3 Rewarded Video Ad Gate
    if (entitlement === 'ad') {
      setIsAdLoading(true);
      rewardedAdManager.showAd({
        onEarnedReward: () => {
          setIsAdLoading(false);
          executeProceedToPressing('ad');
        },
        onAdClosed: () => {
          setIsAdLoading(false);
        },
        onError: (errMsg) => {
          setIsAdLoading(false);
          Alert.alert('Notice', errMsg, [
            { text: 'Try Again', onPress: () => rewardedAdManager.preloadAd() },
            { text: 'Buy Notes', onPress: () => router.push('/modal/paywall') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      });
      return;
    }

    // Step 4: Free or Credit
    executeProceedToPressing(entitlement);
  };

  const getButtonTitle = (): string => {
    if (currentEntitlement === 'ad') {
      return 'WATCH AD TO PRESS';
    }
    return 'MAKE NOTE';
  };

  const scrollViewRef = useRef<ScrollView>(null);

  const handleInputFocus = (offset = 350) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: offset, animated: true });
    }, 150);
  };

  return (
    <PaperContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
        style={styles.keyboardView}
      >
        {/* Top Bar with Back Arrow and Centered Header (1:1 with mockup) */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.charcoal} />
          </Pressable>

          <TypewriterText size="lg" bold letterSpacing={2} color={colors.charcoal}>
            COMPOSE NOTE
          </TypewriterText>

          <View style={styles.placeholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Section: 4-Corner Masking Tape Frame */}
          {selectedPhotoUri ? (
            <View style={styles.photoContainer}>
              <PhotoTape uri={selectedPhotoUri} />
              <View style={styles.changePhotoRow}>
                <Pressable onPress={handlePickFromLibrary} style={styles.changeBtn}>
                  <TypewriterText size="xs" color={colors.inkSecondary}>
                    Choose another
                  </TypewriterText>
                </Pressable>
                <TypewriterText size="xs" color={colors.inkMuted}>
                  ·
                </TypewriterText>
                <Pressable onPress={handleTakePhoto} style={styles.changeBtn}>
                  <TypewriterText size="xs" color={colors.inkSecondary}>
                    Camera
                  </TypewriterText>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPhotoBox}>
              <TypewriterText size="sm" bold color={colors.charcoal} style={styles.pickerPromptTitle}>
                SELECT TRAVEL RECORD
              </TypewriterText>
              <TypewriterText size="xs" color={colors.inkSecondary} style={styles.pickerPromptSubtitle}>
                Add a photo to carve into a stamp poster
              </TypewriterText>

              <View style={styles.pickerButtonsRow}>
                <StampButton
                  title="Photo Library"
                  onPress={handlePickFromLibrary}
                  variant="secondary"
                  style={styles.pickerButton}
                  icon={<Ionicons name="images-outline" size={16} color={colors.charcoal} />}
                />
                <StampButton
                  title="Camera"
                  onPress={handleTakePhoto}
                  variant="secondary"
                  style={styles.pickerButton}
                  icon={<Ionicons name="camera-outline" size={16} color={colors.charcoal} />}
                />
              </View>
            </View>
          )}

          {autoDetectedNotice && (
            <View style={styles.autoDetectBadge}>
              <Ionicons name="sparkles-outline" size={13} color={colors.brickRed} />
              <TypewriterText size="xs" color={colors.brickRed} style={{ marginLeft: 6 }}>
                {autoDetectedNotice}
              </TypewriterText>
            </View>
          )}

          {/* Form Table: Boxed Grid Layout (1:1 with mockup) */}
          <View style={styles.tableBox}>
            {/* Row 1: PLACE / LOCATION */}
            <View style={styles.tableCellTop}>
              <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                PLACE / LOCATION
              </TypewriterText>
              <TextInput
                value={place}
                onChangeText={setPlace}
                placeholder="Location / Place"
                placeholderTextColor={colors.inkMuted}
                style={styles.cellInput}
                autoCorrect={false}
                onFocus={() => handleInputFocus(220)}
              />
            </View>

            {/* Row 2: Split 2 Columns (NO. | YEAR) */}
            <View style={styles.tableRowMiddle}>
              <View style={styles.tableCellHalfLeft}>
                <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                  NO.
                </TypewriterText>
                <TextInput
                  value={noteNumber}
                  onChangeText={setNoteNumber}
                  placeholder="01"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.cellInput}
                  keyboardType="numeric"
                  onFocus={() => handleInputFocus(280)}
                />
              </View>

              <View style={styles.tableCellHalfRight}>
                <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                  YEAR
                </TypewriterText>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder="Year"
                  placeholderTextColor={colors.inkMuted}
                  style={styles.cellInput}
                  keyboardType="numeric"
                  onFocus={() => handleInputFocus(280)}
                />
              </View>
            </View>

            {/* Row 3: THREE MEMORY KEYWORDS */}
            <View style={styles.tableCellBottom}>
              <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                THREE MEMORY KEYWORDS
              </TypewriterText>
              <TextInput
                value={keywordsText}
                onChangeText={setKeywordsText}
                placeholder="Three memory keywords"
                placeholderTextColor={colors.inkMuted}
                style={styles.cellInput}
                autoCorrect={false}
                onFocus={() => handleInputFocus(340)}
              />
            </View>
          </View>

          <View style={{ height: 180 }} />
        </ScrollView>

        {/* Bottom Bar with MAKE NOTE Action Button (1:1 with mockup) */}
        <View style={styles.bottomBar}>
          <StampButton
            title={getButtonTitle()}
            onPress={handlePressAction}
            variant="primary"
            disabled={!selectedPhotoUri}
            loading={isAdLoading}
            style={styles.actionButton}
          />
        </View>
      </KeyboardAvoidingView>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 220,
  },
  photoContainer: {
    marginVertical: spacing.xs,
  },
  changePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  changeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  emptyPhotoBox: {
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginVertical: spacing.md,
  },
  pickerPromptTitle: {
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  pickerPromptSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  pickerButton: {
    flex: 1,
  },
  // Exact 1:1 Boxed Table Grid Form
  tableBox: {
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    backgroundColor: colors.paper,
    marginTop: spacing.lg,
  },
  tableCellTop: {
    padding: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.charcoal,
  },
  tableRowMiddle: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.charcoal,
  },
  tableCellHalfLeft: {
    flex: 1,
    padding: spacing.md,
  },
  tableCellHalfRight: {
    flex: 1,
    padding: spacing.md,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.charcoal,
  },
  tableCellBottom: {
    padding: spacing.md,
  },
  cellHeader: {
    marginBottom: 6,
  },
  cellInput: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.charcoal,
    padding: 0,
    margin: 0,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(244, 239, 230, 0.95)',
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.paperDark,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.paperBorder,
  },
  actionButton: {
    width: '100%',
  },
});
