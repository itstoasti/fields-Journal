export interface ShowAdCallbacks {
  onEarnedReward: () => void;
  onAdClosed: () => void;
  onError: (errorMessage: string) => void;
}

class RewardedAdControllerWeb {
  public async preloadAd(): Promise<void> {
    console.log('[AdMob Web] Preloading mocked rewarded ad');
  }

  public isReady(): boolean {
    return true;
  }

  public async showAd(callbacks: ShowAdCallbacks): Promise<void> {
    console.log('[AdMob Web] Simulating rewarded ad completion');
    callbacks.onEarnedReward();
  }
}

export const rewardedAdManager = new RewardedAdControllerWeb();
