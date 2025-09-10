// UTM tracking utility for capturing and persisting Facebook marketing attribution
export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  fbclid?: string | null;
  referrer?: string;
  landingPage?: string;
}

export class UtmTracker {
  private static UTM_STORAGE_KEY = 'beta_reader_utm_params';
  private static UTM_SESSION_KEY = 'beta_reader_utm_session';

  // Capture UTM parameters from URL
  static captureUtmParams(): UtmParams {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: UtmParams = {
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      utm_term: urlParams.get('utm_term'),
      utm_content: urlParams.get('utm_content'),
      fbclid: urlParams.get('fbclid'),
      referrer: document.referrer,
      landingPage: window.location.href,
    };

    // Only save if there are actual UTM params or fbclid
    if (utmParams.utm_source || utmParams.utm_medium || utmParams.utm_campaign || utmParams.fbclid) {
      this.saveUtmParams(utmParams);
    }

    return utmParams;
  }

  // Save UTM parameters to session storage only
  private static saveUtmParams(params: UtmParams): void {
    try {
      // Get existing params
      const existingParams = this.getStoredUtmParams();
      
      // Only overwrite if new params have more information
      if (!existingParams || this.hasMoreInfo(params, existingParams)) {
        sessionStorage.setItem(this.UTM_SESSION_KEY, JSON.stringify(params));
      }
    } catch (error) {
      console.error('Failed to save UTM params:', error);
    }
  }

  // Get stored UTM parameters
  static getStoredUtmParams(): UtmParams | null {
    try {
      // Only check session storage (current session)
      const sessionParams = sessionStorage.getItem(this.UTM_SESSION_KEY);
      return sessionParams ? JSON.parse(sessionParams) : null;
    } catch (error) {
      console.error('Failed to get UTM params:', error);
      return null;
    }
  }

  // Check if new params have more information than existing
  private static hasMoreInfo(newParams: UtmParams, existingParams: UtmParams): boolean {
    const newCount = Object.values(newParams).filter(v => v && v !== '').length;
    const existingCount = Object.values(existingParams).filter(v => v && v !== '').length;
    
    // Prioritize Facebook params
    if (newParams.fbclid && !existingParams.fbclid) {
      return true;
    }
    
    return newCount > existingCount;
  }

  // Clear stored UTM parameters (after conversion)
  static clearUtmParams(): void {
    try {
      sessionStorage.removeItem(this.UTM_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear UTM params:', error);
    }
  }

  // Get UTMs formatted for OrinPay API
  static getForOrinPay(): Record<string, string> {
    const utmParams = this.getStoredUtmParams();
    if (!utmParams) return {};
    
    const formatted: Record<string, string> = {};
    
    // Include all UTM parameters and tracking IDs
    if (utmParams.utm_source) formatted.utm_source = utmParams.utm_source;
    if (utmParams.utm_medium) formatted.utm_medium = utmParams.utm_medium;
    if (utmParams.utm_campaign) formatted.utm_campaign = utmParams.utm_campaign;
    if (utmParams.utm_term) formatted.utm_term = utmParams.utm_term;
    if (utmParams.utm_content) formatted.utm_content = utmParams.utm_content;
    if (utmParams.fbclid) formatted.fbclid = utmParams.fbclid;
    if (utmParams.referrer) formatted.referrer = utmParams.referrer;
    if (utmParams.landingPage) formatted.landingPage = utmParams.landingPage;
    
    return formatted;
  }

  // Send UTM data to backend
  static async sendUtmDataToBackend(userId: string): Promise<void> {
    const utmParams = this.getStoredUtmParams();
    if (!utmParams) return;

    try {
      const response = await fetch('/api/utm/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...utmParams,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send UTM data');
      }
    } catch (error) {
      console.error('Failed to send UTM data to backend:', error);
    }
  }

  // Track conversion (when user upgrades to paid plan)
  static async trackConversion(userId: string, plan: string): Promise<void> {
    try {
      const response = await fetch('/api/utm/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          plan,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to track conversion');
      }

      // Clear UTM params after successful conversion
      this.clearUtmParams();
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  }
}

// Initialize UTM tracking on page load
if (typeof window !== 'undefined') {
  // Capture on initial load
  UtmTracker.captureUtmParams();
  
  // Also capture on navigation changes (for SPAs)
  window.addEventListener('popstate', () => {
    UtmTracker.captureUtmParams();
  });
}