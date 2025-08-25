import { Page, expect } from "@playwright/test";
import { testUsers, testLocations, testNetworks } from "./test-data";

export class TestHelpers {
  constructor(private page: Page) {}

  // Authentication helpers
  async loginUser(user: typeof testUsers.user1) {
    await this.page.goto("/login");
    
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async registerUser(user: typeof testUsers.user1) {
    await this.page.goto("/register");
    
    await this.page.fill('[data-testid="username-input"]', user.username);
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.fill('[data-testid="confirm-password-input"]', user.password);
    await this.page.click('[data-testid="register-button"]');
    
    // Wait for registration to complete
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL(/\/login/);
  }

  // Discovery helpers
  async setupGPSLocation(location = testLocations.newyork) {
    await this.page.context().setGeolocation({
      latitude: location.lat,
      longitude: location.lng,
    });
    await this.page.context().grantPermissions(["geolocation"]);
  }

  async setupWiFiNetwork(network = testNetworks.office_wifi) {
    // Mock Wi-Fi network detection
    await this.page.addInitScript((networkData) => {
      // @ts-ignore
      window.mockWiFiNetwork = networkData;
    }, network);
  }

  async triggerDiscovery(mode: "gps" | "wifi" | "bluetooth" = "gps") {
    await this.page.goto("/dashboard/discover");
    
    // Select discovery mode
    await this.page.click(`[data-testid="${mode}-discovery-tab"]`);
    
    // Trigger discovery
    await this.page.click('[data-testid="discover-button"]');
    
    // Wait for results
    await expect(this.page.locator('[data-testid="discovery-results"]')).toBeVisible({
      timeout: 10000,
    });
  }

  // Friend management helpers
  async sendFriendRequest(targetUsername: string) {
    // Assume we're on discover page with nearby users
    await this.page.click(`[data-testid="user-card-${targetUsername}"]`);
    await this.page.click('[data-testid="send-friend-request"]');
    
    await expect(this.page.locator('[data-testid="request-sent-message"]')).toBeVisible();
  }

  async acceptFriendRequest(fromUsername: string) {
    await this.page.goto("/dashboard/friends");
    await this.page.click('[data-testid="friend-requests-tab"]');
    
    await this.page
      .locator(`[data-testid="friend-request-${fromUsername}"] [data-testid="accept-request"]`)
      .click();
      
    await expect(
      this.page.locator(`[data-testid="friend-request-${fromUsername}"]`)
    ).not.toBeVisible();
  }

  async rejectFriendRequest(fromUsername: string) {
    await this.page.goto("/dashboard/friends");
    await this.page.click('[data-testid="friend-requests-tab"]');
    
    await this.page
      .locator(`[data-testid="friend-request-${fromUsername}"] [data-testid="reject-request"]`)
      .click();
      
    await expect(
      this.page.locator(`[data-testid="friend-request-${fromUsername}"]`)
    ).not.toBeVisible();
  }

  // Messaging helpers
  async startChat(withUsername: string) {
    await this.page.goto("/dashboard/chat");
    await this.page.click(`[data-testid="conversation-${withUsername}"]`);
    
    await expect(this.page.locator('[data-testid="chat-window"]')).toBeVisible();
  }

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="message-input"]', message);
    await this.page.press('[data-testid="message-input"]', "Enter");
    
    // Verify message appears in chat
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  async waitForMessage(message: string, timeout = 5000) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible({
      timeout,
    });
  }

  async startTyping() {
    await this.page.fill('[data-testid="message-input"]', "Typing...");
  }

  async stopTyping() {
    await this.page.fill('[data-testid="message-input"]', "");
  }

  // Call helpers
  async initiateVoiceCall(withUsername: string) {
    // Assume we're in a chat window
    await this.page.click('[data-testid="voice-call-button"]');
    
    await expect(this.page.locator('[data-testid="call-modal"]')).toBeVisible();
  }

  async initiateVideoCall(withUsername: string) {
    await this.page.click('[data-testid="video-call-button"]');
    
    await expect(this.page.locator('[data-testid="call-modal"]')).toBeVisible();
  }

  async answerCall() {
    await this.page.click('[data-testid="answer-call-button"]');
    
    await expect(this.page.locator('[data-testid="call-connected"]')).toBeVisible();
  }

  async endCall() {
    await this.page.click('[data-testid="end-call-button"]');
    
    await expect(this.page.locator('[data-testid="call-modal"]')).not.toBeVisible();
  }

  async muteCall() {
    await this.page.click('[data-testid="mute-button"]');
    
    await expect(this.page.locator('[data-testid="muted-indicator"]')).toBeVisible();
  }

  async unmuteCall() {
    await this.page.click('[data-testid="mute-button"]');
    
    await expect(this.page.locator('[data-testid="muted-indicator"]')).not.toBeVisible();
  }

  // Profile helpers
  async updateProfile(updates: { bio?: string; firstName?: string; lastName?: string }) {
    await this.page.goto("/dashboard/profile");
    
    if (updates.firstName) {
      await this.page.fill('[data-testid="first-name-input"]', updates.firstName);
    }
    
    if (updates.lastName) {
      await this.page.fill('[data-testid="last-name-input"]', updates.lastName);
    }
    
    if (updates.bio) {
      await this.page.fill('[data-testid="bio-input"]', updates.bio);
    }
    
    await this.page.click('[data-testid="save-profile"]');
    
    await expect(this.page.locator('[data-testid="profile-saved-message"]')).toBeVisible();
  }

  async uploadProfilePicture(imagePath: string) {
    await this.page.goto("/dashboard/profile");
    
    // Upload file
    const fileInput = this.page.locator('[data-testid="profile-picture-input"]');
    await fileInput.setInputFiles(imagePath);
    
    // Wait for upload to complete
    await expect(this.page.locator('[data-testid="upload-success"]')).toBeVisible();
  }

  // Mobile-specific helpers
  async openMobileMenu() {
    if (await this.page.locator('[data-testid="mobile-menu-toggle"]').isVisible()) {
      await this.page.click('[data-testid="mobile-menu-toggle"]');
      await expect(this.page.locator('[data-testid="mobile-sidebar"]')).toBeVisible();
    }
  }

  async closeMobileMenu() {
    if (await this.page.locator('[data-testid="mobile-sidebar"]').isVisible()) {
      await this.page.click('[data-testid="mobile-menu-close"]');
      await expect(this.page.locator('[data-testid="mobile-sidebar"]')).not.toBeVisible();
    }
  }

  async swipeLeft() {
    const viewport = this.page.viewportSize();
    if (viewport) {
      await this.page.touchscreen.tap(viewport.width * 0.8, viewport.height * 0.5);
      await this.page.mouse.down();
      await this.page.mouse.move(viewport.width * 0.2, viewport.height * 0.5);
      await this.page.mouse.up();
    }
  }

  async swipeRight() {
    const viewport = this.page.viewportSize();
    if (viewport) {
      await this.page.touchscreen.tap(viewport.width * 0.2, viewport.height * 0.5);
      await this.page.mouse.down();
      await this.page.mouse.move(viewport.width * 0.8, viewport.height * 0.5);
      await this.page.mouse.up();
    }
  }

  // Performance helpers
  async measurePageLoad(url: string) {
    const startTime = Date.now();
    await this.page.goto(url);
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState("networkidle");
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  async measureDiscoveryTime() {
    const startTime = Date.now();
    await this.page.click('[data-testid="discover-button"]');
    
    await expect(this.page.locator('[data-testid="discovery-results"]')).toBeVisible();
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  // Cleanup helpers
  async clearBrowserData() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  async waitForStableState(timeout = 2000) {
    await this.page.waitForTimeout(timeout);
    await this.page.waitForLoadState("networkidle");
  }
}

// Global helper functions that can be used without class instance
export async function setupFriendship(page1: Page, page2: Page) {
  const helper1 = new TestHelpers(page1);
  const helper2 = new TestHelpers(page2);
  
  // Login both users
  await helper1.loginUser(testUsers.user1);
  await helper2.loginUser(testUsers.user2);
  
  // Setup location for discovery
  await helper1.setupGPSLocation(testLocations.newyork);
  await helper2.setupGPSLocation(testLocations.newyork);
  
  // User 1 discovers and sends friend request
  await helper1.triggerDiscovery("gps");
  await helper1.sendFriendRequest(testUsers.user2.username);
  
  // User 2 accepts friend request
  await helper2.acceptFriendRequest(testUsers.user1.username);
  
  // Verify friendship
  await helper1.page.goto("/dashboard/friends");
  await expect(helper1.page.locator(`[data-testid="friend-${testUsers.user2.username}"]`)).toBeVisible();
}

export async function setupChatSession(page: Page) {
  const helper = new TestHelpers(page);
  
  await helper.loginUser(testUsers.user1);
  await helper.startChat(testUsers.user2.username);
  
  return helper;
}

export default TestHelpers;