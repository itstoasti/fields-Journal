import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import { searchLocationSuggestions, LocationSuggestion } from '../src/lib/locationSearch';
import { preparePhotoForVision } from '../src/lib/image';
import { suggestKeywordsFromImage } from '../src/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ photoUri?: string }>();
  const getNextNoteNumber = useAppStore((state) => state.getNextNoteNumber);
  const hasConsentedPrivacy = useAppStore((state) => state.hasConsentedPrivacy);
  const getEntitlementType = useAppStore((state) => state.getEntitlementType);
  const syncWithBackend = useAppStore((state) => state.syncWithBackend);

  useFocusEffect(
    useCallback(() => {
      syncWithBackend();
    }, [syncWithBackend])
  );

  // Form states: starts empty so user provides their own photo
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(
    params.photoUri || null
  );
  const [place, setPlace] = useState<string>('');
  const [noteNumber, setNoteNumber] = useState<string>(getNextNoteNumber());
  const [year, setYear] = useState<string>('');
  const [keywordsText, setKeywordsText] = useState<string>('');
  const [isAdLoading, setIsAdLoading] = useState<boolean>(false);
  const [autoDetectedNotice, setAutoDetectedNotice] = useState<string | null>(null);

  // Keyboard and scroll tracking
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Location search suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState<boolean>(false);
  const searchDebounceRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Preload rewarded ad if on ad step
  const currentEntitlement = getEntitlementType();
  useEffect(() => {
    if (currentEntitlement === 'ad') {
      rewardedAdManager.preloadAd();
    }
  }, [currentEntitlement]);

  const handleLocationChange = (text: string) => {
    setPlace(text);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (text.trim().length >= 2) {
      setIsSearchingLocation(true);
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const results = await searchLocationSuggestions(text);
          setLocationSuggestions(results);
          if (results.length > 0) {
            scrollViewRef.current?.scrollTo({ y: 220, animated: true });
          }
        } finally {
          setIsSearchingLocation(false);
        }
      }, 200);
    } else {
      setIsSearchingLocation(false);
      setLocationSuggestions([]);
    }
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setPlace(suggestion.formatted);
    setLocationSuggestions([]);
    Keyboard.dismiss();
  };

  // AI Keyword Suggestion state
  const [isDetectingKeywords, setIsDetectingKeywords] = useState<boolean>(false);

  const handleAutoDetectKeywords = async (photoOverride?: string, placeOverride?: string) => {
    const photoToUse = photoOverride || selectedPhotoUri;
    if (!photoToUse) {
      Alert.alert('Select Photo', 'Please select a photo first to suggest keywords.');
      return;
    }

    try {
      setIsDetectingKeywords(true);
      const thumbnail = await preparePhotoForVision(photoToUse);
      if (!thumbnail.base64) {
        throw new Error('Could not process thumbnail for keyword detection.');
      }

      const placeToUse = placeOverride !== undefined ? placeOverride : place;
      const res = await suggestKeywordsFromImage(thumbnail.base64, placeToUse);
      if (res.keywords && res.keywords.length > 0) {
        setKeywordsText(res.formatted || res.keywords.join(', '));
      }
    } catch (err: any) {
      console.warn('[Compose] Keyword detection failed:', err);
    } finally {
      setIsDetectingKeywords(false);
    }
  };

  const applyExtractedMetadata = async (result: {
    uri?: string;
    fileName?: string;
    exif?: Record<string, any>;
    location?: { latitude: number; longitude: number };
    creationTime?: number;
    metadataUnavailable?: boolean;
  }) => {
    try {
      const meta = await extractPhotoMetadata({
        uri: result.uri,
        fileName: result.fileName,
        exif: result.exif,
        location: result.location,
        creationTime: result.creationTime,
      });

      if (meta.place) {
        setPlace(meta.place);
      }
      if (meta.year) {
        setYear(meta.year);
      }
      if (meta.keywords && meta.keywords.length > 0) {
        setKeywordsText(meta.keywords.join(' · '));
      }

      if (meta.place || meta.year) {
        setAutoDetectedNotice(
          meta.place && meta.year
            ? `Auto-detected: ${meta.place} (${meta.year})`
            : meta.place
            ? `Auto-detected: ${meta.place}`
            : `Auto-detected year: ${meta.year}`
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

  const executeProceedToPressing = (entitlementType: 'free' | 'ad' | 'credit' | 'pro', yearOverride?: string) => {
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
        year: (yearOverride || year).trim() || new Date().getFullYear().toString(),
        entitlement: entitlementType,
      },
    });
  };

  const proceedWithEntitlement = (confirmedYear: string) => {
    // Step 1: Check First-run Privacy Consent
    if (!hasConsentedPrivacy) {
      router.push('/modal/privacy-consent');
      return;
    }

    const entitlement = getEntitlementType();

    // Step 2: Handle Pro subscribers (unlimited access, bypass ads and paywalls)
    if (entitlement === 'pro') {
      executeProceedToPressing('pro', confirmedYear);
      return;
    }

    // Step 3: Handle Paywall
    if (entitlement === 'paywall') {
      router.push('/modal/paywall');
      return;
    }

    // Step 4: Handle Note 3 Rewarded Video Ad Gate
    if (entitlement === 'ad') {
      setIsAdLoading(true);
      rewardedAdManager.showAd({
        onEarnedReward: () => {
          setIsAdLoading(false);
          executeProceedToPressing('ad', confirmedYear);
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

    // Step 5: Notes 1-2 Free or Credit
    executeProceedToPressing(entitlement, confirmedYear);
  };

  const handlePressAction = async () => {
    if (!selectedPhotoUri) {
      Alert.alert('Photo Required', 'Please select a photo from your library or camera first.');
      return;
    }

    // Safeguard: If photo has no detected year, confirm with user before spending a credit
    if (!year.trim()) {
      const currentYearStr = new Date().getFullYear().toString();
      Alert.alert(
        'Confirm Year',
        `No capture date was detected on this photo. Would you like to use ${currentYearStr} or enter the year it was taken?`,
        [
          { text: 'Enter Year', style: 'cancel', onPress: () => handleInputFocus('year') },
          {
            text: `Use ${currentYearStr}`,
            onPress: () => {
              setYear(currentYearStr);
              proceedWithEntitlement(currentYearStr);
            },
          },
        ]
      );
      return;
    }

    proceedWithEntitlement(year.trim());
  };

  const handleInputFocus = (target: 'place' | 'number' | 'year' | 'keywords') => {
    setTimeout(() => {
      if (target === 'place') {
        scrollViewRef.current?.scrollTo({ y: 220, animated: true });
      } else if (target === 'number' || target === 'year') {
        scrollViewRef.current?.scrollTo({ y: 360, animated: true });
      } else if (target === 'keywords') {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 200);
  };

  const getButtonTitle = () => {
    const ent = getEntitlementType();
    if (ent === 'pro') return 'MAKE NOTE (PRO)';
    if (ent === 'free') return 'MAKE NOTE (FREE)';
    if (ent === 'ad') return 'WATCH AD TO MAKE NOTE';
    if (ent === 'credit') return 'MAKE NOTE (1 CREDIT)';
    return 'PURCHASE NOTES';
  };

  return (
    <PaperContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: isKeyboardVisible ? keyboardHeight + 140 : 160 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Top Bar Navigation */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back to Notebook"
            >
              <Ionicons name="arrow-back" size={24} color={colors.charcoal} />
            </Pressable>

            <TypewriterText size="sm" bold letterSpacing={2}>
              NEW FIELD NOTE
            </TypewriterText>

            <View style={styles.placeholder} />
          </View>

          {/* Photo Selection Area */}
          {selectedPhotoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <View style={styles.photoContainer}>
                <PhotoTape
                  uri={selectedPhotoUri}
                  aspectRatio={4 / 3}
                />
              </View>
              <View style={styles.photoActionsRow}>
                <Pressable
                  onPress={handlePickFromLibrary}
                  style={styles.changePhotoButton}
                >
                  <Ionicons name="images-outline" size={14} color={colors.charcoal} />
                  <TypewriterText size="xs" color={colors.charcoal} style={{ marginLeft: 6 }}>
                    Change Photo
                  </TypewriterText>
                </Pressable>
                <Pressable
                  onPress={handleTakePhoto}
                  style={styles.changePhotoButton}
                >
                  <Ionicons name="camera-outline" size={14} color={colors.charcoal} />
                  <TypewriterText size="xs" color={colors.charcoal} style={{ marginLeft: 6 }}>
                    Retake
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

          {/* Form Table: Boxed Grid Layout */}
          <View style={styles.tableBox}>
            {/* Row 1: PLACE / LOCATION */}
            <View style={styles.tableCellTop}>
              <View style={styles.cellHeaderRow}>
                <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                  PLACE / LOCATION
                </TypewriterText>
                {isSearchingLocation && (
                  <ActivityIndicator size="small" color={colors.brickRed} style={{ marginLeft: 8 }} />
                )}
              </View>
              <TextInput
                value={place}
                onChangeText={handleLocationChange}
                placeholder="e.g. Huntington Beach or Kyoto"
                placeholderTextColor={colors.inkMuted}
                style={styles.cellInput}
                autoCorrect={false}
                onFocus={() => handleInputFocus('place')}
              />
            </View>

            {/* Autocomplete Location Suggestions Dropdown */}
            {locationSuggestions.length > 0 && (
              <View style={styles.suggestionsCard}>
                <View style={styles.suggestionsHeader}>
                  <Ionicons name="sparkles" size={12} color={colors.brickRed} />
                  <TypewriterText size="xs" bold color={colors.inkSecondary} letterSpacing={1} style={{ marginLeft: 4 }}>
                    SUGGESTED LOCATIONS
                  </TypewriterText>
                </View>
                {locationSuggestions.map((item, idx) => (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.suggestionRow,
                      idx > 0 && styles.suggestionBorderTop,
                      pressed && { backgroundColor: colors.paperDark },
                    ]}
                    onPress={() => handleSelectLocation(item)}
                  >
                    <Ionicons name="location-sharp" size={15} color={colors.brickRed} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <TypewriterText size="sm" bold color={colors.charcoal}>
                        {item.formatted}
                      </TypewriterText>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={colors.inkMuted} />
                  </Pressable>
                ))}
              </View>
            )}

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
                  onFocus={() => handleInputFocus('number')}
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
                  onFocus={() => handleInputFocus('year')}
                />
              </View>
            </View>

            {/* Row 3: THREE MEMORY KEYWORDS */}
            <View style={styles.tableCellBottom}>
              <View style={styles.keywordsHeaderRow}>
                <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1.5} style={styles.cellHeader}>
                  THREE MEMORY KEYWORDS
                </TypewriterText>
                {selectedPhotoUri ? (
                  <Pressable
                    onPress={() => handleAutoDetectKeywords()}
                    disabled={isDetectingKeywords}
                    style={styles.magicDetectButton}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Auto-detect memory keywords"
                  >
                    {isDetectingKeywords ? (
                      <ActivityIndicator size="small" color={colors.charcoal} />
                    ) : (
                      <View style={styles.magicDetectInner}>
                        <Ionicons name="sparkles" size={11} color={colors.charcoal} />
                        <TypewriterText size="xs" bold color={colors.charcoal} letterSpacing={1} style={styles.magicDetectText}>
                          {keywordsText ? 'REROLL' : 'SUGGEST'}
                        </TypewriterText>
                      </View>
                    )}
                  </Pressable>
                ) : null}
              </View>
              <TextInput
                value={keywordsText}
                onChangeText={setKeywordsText}
                placeholder="Three memory keywords (e.g. ocean, sunset, breeze)"
                placeholderTextColor={colors.inkMuted}
                style={styles.cellInput}
                autoCorrect={false}
                onFocus={() => handleInputFocus('keywords')}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar with MAKE NOTE Action Button - automatically hidden while keyboard is active */}
        {!isKeyboardVisible && (
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
        )}
      </KeyboardAvoidingView>
    </PaperContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  photoPreviewWrapper: {
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  photoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.paperDark,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.paperBorder,
  },
  emptyPhotoBox: {
    backgroundColor: colors.paperDark,
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
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
  // Boxed Table Grid Form
  tableBox: {
    borderWidth: 1.5,
    borderColor: colors.charcoal,
    backgroundColor: colors.paper,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  tableCellTop: {
    padding: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.charcoal,
  },
  cellHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  keywordsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  magicDetectButton: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    backgroundColor: colors.paperDark,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.paperBorder,
  },
  magicDetectInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  magicDetectText: {
    fontSize: 9,
    includeFontPadding: false,
  },
  cellHeader: {
    marginBottom: 0,
  },
  cellInput: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.charcoal,
    padding: 0,
    margin: 0,
    fontWeight: '600',
  },
  // Location Suggestions Dropdown
  suggestionsCard: {
    backgroundColor: '#FAF6EF',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.charcoal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  suggestionBorderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.paperBorder,
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
