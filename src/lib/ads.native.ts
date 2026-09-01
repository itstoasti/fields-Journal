import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;

if (!isExpoGo) {
  try {
    const adsModule = require('react-native-google-mobile-ads');
    RewardedAd = adsModule.RewardedAd;
    RewardedAdEventType = adsModule.RewardedAdEventType;
    AdEventType = adsModule.AdEventType;
  } catch (err) {
    console.warn('[AdMob Native] Native AdMob module unavailable in this build, using simulated ads:', err);
  }
}

const REWARDED_AD_UNIT_ID =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID ||
  'ca-app-pub-3940256099942544/5224354917'; // Google Test Rewarded Ad ID

export interface ShowAdCallbacks {
  onEarnedReward: () => void;
  onAdClosed: () => void;
  onError: (errorMessage: string) => void;
}

class RewardedAdController {
  private rewardedAdInstance: any = null;
  private isAdLoaded: boolean = false;
  private isLoading: boolean = false;
  private earnedReward: boolean = false;

  public async preloadAd(): Promise<void> {
    if (isExpoGo || !RewardedAd) {
      console.log('[AdMob] Expo Go detected: Rewarded ads simulated');
      this.isAdLoaded = true;
      return;
    }

    if (this.isAdLoaded || this.isLoading) {
      return;
    }

    try {
      this.isLoading = true;
      this.isAdLoaded = false;
      this.earnedReward = false;

      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded ad loaded and ready');
        this.isAdLoaded = true;
        this.isLoading = false;
      });

      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
        console.log('[AdMob] User earned reward:', reward);
        this.earnedReward = true;
      });

      ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.warn('[AdMob] Rewarded ad failed to load:', error);
        this.isAdLoaded = false;
        this.isLoading = false;
      });

      this.rewardedAdInstance = ad;
      ad.load();
    } catch (error) {
      console.warn('[AdMob] AdMob native module not available or preload failed:', error);
      this.isLoading = false;
    }
  }

  public isReady(): boolean {
    return this.isAdLoaded;
  }

  public async showAd(callbacks: ShowAdCallbacks): Promise<void> {
    if (isExpoGo || !RewardedAd) {
      console.log('[AdMob] Expo Go detected: Simulating rewarded ad view & reward');
      setTimeout(() => {
        callbacks.onEarnedReward();
      }, 600);
      return;
    }

    try {
      if (!this.rewardedAdInstance || !this.isAdLoaded) {
        console.warn('[AdMob] Ad not preloaded. Showing ad unavailable error.');
        callbacks.onError('Ad unavailable. Try again or buy notes.');
        return;
      }

      this.earnedReward = false;

      const unsubscribeClosed = this.rewardedAdInstance.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubscribeClosed();
          unsubscribeEarned();
          const didEarn = this.earnedReward;
          this.isAdLoaded = false;
          this.rewardedAdInstance = null;
          this.preloadAd();

          if (didEarn) {
            callbacks.onEarnedReward();
          } else {
            callbacks.onAdClosed();
          }
        }
      );

      const unsubscribeEarned = this.rewardedAdInstance.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          this.earnedReward = true;
        }
      );

      await this.rewardedAdInstance.show();
    } catch (error: any) {
      console.warn('[AdMob] Failed to show rewarded ad, falling back:', error);
      if (__DEV__) {
        console.log('[AdMob Dev] Mocking rewarded video completion in dev environment');
        callbacks.onEarnedReward();
        return;
      }
      callbacks.onError('Ad unavailable. Try again or buy notes.');
    }
  }
}

export const rewardedAdManager = new RewardedAdController();
