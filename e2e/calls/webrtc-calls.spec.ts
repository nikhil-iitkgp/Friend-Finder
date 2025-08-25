import { test, expect } from "@playwright/test";
import { testUsers } from "../fixtures/test-data";
import TestHelpers, { setupFriendship } from "../fixtures/test-helpers";

test.describe("Voice/Video Calling", () => {
  test.beforeEach(async ({ context }) => {
    // Grant media permissions for all tests
    await context.grantPermissions(["camera", "microphone"]);
  });

  test.describe("Call Initiation", () => {
    test("should initiate voice call from chat interface", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        // Grant permissions
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Start chat
        await helper1.startChat(testUsers.user2.username);
        
        // Initiate voice call
        await page1.click('[data-testid="voice-call-button"]');

        // Should open call modal for caller
        await expect(page1.locator('[data-testid="call-modal"]')).toBeVisible();
        await expect(page1.locator('[data-testid="call-status"]')).toContainText("Calling");
        await expect(page1.locator('[data-testid="calling-user"]')).toContainText(testUsers.user2.username);

        // Should show call controls
        await expect(page1.locator('[data-testid="mute-button"]')).toBeVisible();
        await expect(page1.locator('[data-testid="end-call-button"]')).toBeVisible();
        await expect(page1.locator('[data-testid="video-toggle-button"]')).toBeVisible();

        // Receiver should get incoming call notification
        await expect(page2.locator('[data-testid="incoming-call-modal"]')).toBeVisible({ timeout: 5000 });
        await expect(page2.locator('[data-testid="incoming-caller"]')).toContainText(testUsers.user1.username);
        await expect(page2.locator('[data-testid="call-type"]')).toContainText("Voice Call");

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should initiate video call from friends list", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Initiate call from friends list
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await page1.click(`[data-testid="friend-${testUsers.user2.username}"] [data-testid="video-call-friend"]`);

        // Should open video call modal
        await expect(page1.locator('[data-testid="call-modal"]')).toBeVisible();
        await expect(page1.locator('[data-testid="video-preview"]')).toBeVisible();
        
        // Receiver gets video call notification
        await expect(page2.locator('[data-testid="incoming-call-modal"]')).toBeVisible({ timeout: 5000 });
        await expect(page2.locator('[data-testid="call-type"]')).toContainText("Video Call");

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle call permissions denied", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const helper1 = new TestHelpers(page1);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper1.startChat(testUsers.user2.username);

        // Mock permission denied
        await page1.addInitScript(() => {
          navigator.mediaDevices.getUserMedia = () => 
            Promise.reject(new Error("Permission denied"));
        });

        await page1.click('[data-testid="voice-call-button"]');

        // Should show permission error
        await expect(page1.locator('[data-testid="permission-error-modal"]')).toBeVisible();
        await expect(page1.locator('[data-testid="permission-error-message"]')).toContainText("microphone permission");

      } finally {
        await context1.close();
      }
    });
  });

  test.describe("Call Answering", () => {
    test("should answer incoming voice call successfully", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Setup chat and initiate call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);

        // User 2 is on dashboard and receives call
        await page2.goto("/dashboard");
        await expect(page2.locator('[data-testid="incoming-call-modal"]')).toBeVisible({ timeout: 5000 });

        // Answer the call
        await helper2.answerCall();

        // Both users should see connected state
        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });
        await expect(page2.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // Should show call duration timer
        await expect(page1.locator('[data-testid="call-duration"]')).toBeVisible();
        await expect(page2.locator('[data-testid="call-duration"]')).toBeVisible();

        // Should show active call controls
        await expect(page1.locator('[data-testid="mute-button"]')).toBeEnabled();
        await expect(page1.locator('[data-testid="end-call-button"]')).toBeEnabled();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should reject incoming call", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Initiate call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);

        // Reject call
        await page2.goto("/dashboard");
        await expect(page2.locator('[data-testid="incoming-call-modal"]')).toBeVisible({ timeout: 5000 });
        await page2.click('[data-testid="reject-call-button"]');

        // Call should end for both users
        await expect(page2.locator('[data-testid="incoming-call-modal"]')).not.toBeVisible();
        await expect(page1.locator('[data-testid="call-rejected-message"]')).toBeVisible();
        await expect(page1.locator('[data-testid="call-modal"]')).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle missed calls", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);

        // User 2 is not available (simulated by not answering)
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);

        // Wait for call timeout (usually 30-60 seconds)
        await page1.waitForTimeout(10000); // Shortened for test

        // Should show call timeout/missed
        await expect(page1.locator('[data-testid="call-timeout-message"]')).toBeVisible({ timeout: 15000 });
        await expect(page1.locator('[data-testid="call-modal"]')).not.toBeVisible();

        // User 2 should see missed call notification when they come online
        await helper2.loginUser(testUsers.user2);
        await page2.goto("/dashboard");
        await expect(page2.locator('[data-testid="missed-call-notification"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Call Controls", () => {
    test("should mute and unmute audio during call", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Establish call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // Test mute functionality
        await helper1.muteCall();
        await expect(page1.locator('[data-testid="muted-indicator"]')).toBeVisible();
        
        // Other user should see mute indicator
        await expect(page2.locator('[data-testid="remote-muted-indicator"]')).toBeVisible({ timeout: 3000 });

        // Test unmute
        await helper1.unmuteCall();
        await expect(page1.locator('[data-testid="muted-indicator"]')).not.toBeVisible();
        await expect(page2.locator('[data-testid="remote-muted-indicator"]')).not.toBeVisible({ timeout: 3000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should toggle video during call", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Start with voice call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // Enable video
        await page1.click('[data-testid="video-toggle-button"]');
        
        // Should show video preview
        await expect(page1.locator('[data-testid="local-video"]')).toBeVisible();
        await expect(page1.locator('[data-testid="video-enabled-indicator"]')).toBeVisible();

        // Other user should see video request/enabled
        await expect(page2.locator('[data-testid="remote-video"]')).toBeVisible({ timeout: 5000 });

        // Disable video
        await page1.click('[data-testid="video-toggle-button"]');
        await expect(page1.locator('[data-testid="local-video"]')).not.toBeVisible();
        await expect(page2.locator('[data-testid="remote-video"]')).not.toBeVisible({ timeout: 5000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should switch between speaker and earpiece", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const helper1 = new TestHelpers(page1);

      try {
        await helper1.loginUser(testUsers.user1);
        
        await context1.grantPermissions(["camera", "microphone"]);

        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);

        // Test speaker toggle (mainly for mobile)
        if (await page1.locator('[data-testid="speaker-toggle-button"]').isVisible()) {
          await page1.click('[data-testid="speaker-toggle-button"]');
          await expect(page1.locator('[data-testid="speaker-enabled-indicator"]')).toBeVisible();

          await page1.click('[data-testid="speaker-toggle-button"]');
          await expect(page1.locator('[data-testid="speaker-enabled-indicator"]')).not.toBeVisible();
        }

      } finally {
        await context1.close();
      }
    });
  });

  test.describe("Call Termination", () => {
    test("should end call properly", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Establish call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // End call from caller side
        await helper1.endCall();

        // Both users should see call ended
        await expect(page1.locator('[data-testid="call-modal"]')).not.toBeVisible();
        await expect(page2.locator('[data-testid="call-modal"]')).not.toBeVisible();

        // Should return to normal chat interface
        await expect(page1.locator('[data-testid="chat-window"]')).toBeVisible();
        await expect(page2.locator('[data-testid="chat-window"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle call ending from receiver side", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Establish call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page2.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // End call from receiver side
        await helper2.endCall();

        // Both users should see call ended
        await expect(page1.locator('[data-testid="call-modal"]')).not.toBeVisible();
        await expect(page2.locator('[data-testid="call-modal"]')).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Call Quality and Connection", () => {
    test("should handle connection quality indicators", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Establish call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });

        // Should show connection quality indicators
        await expect(page1.locator('[data-testid="connection-quality"]')).toBeVisible();
        
        // Simulate poor connection
        await context1.route("**/*", route => {
          // Add artificial delay
          setTimeout(() => route.continue(), 1000);
        });

        // Should show poor connection warning
        await expect(page1.locator('[data-testid="poor-connection-warning"]')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle WebRTC connection failures", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Mock WebRTC connection failure
        await page1.addInitScript(() => {
          const originalRTCPeerConnection = window.RTCPeerConnection;
          window.RTCPeerConnection = class extends originalRTCPeerConnection {
            constructor(config) {
              super(config);
              // Simulate connection failure after some time
              setTimeout(() => {
                this.onconnectionstatechange?.({ target: { connectionState: 'failed' } });
              }, 2000);
            }
          };
        });

        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        // Should show connection failure message
        await expect(page1.locator('[data-testid="connection-failed-message"]')).toBeVisible({ timeout: 10000 });
        
        // Should offer retry option
        await expect(page1.locator('[data-testid="retry-call-button"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Call History and Notifications", () => {
    test("should record call history", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // Make a call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);
        await helper2.answerCall();

        await expect(page1.locator('[data-testid="call-connected"]')).toBeVisible({ timeout: 10000 });
        
        // Let call run for a bit then end
        await page1.waitForTimeout(3000);
        await helper1.endCall();

        // Check call history
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="call-history-tab"]');

        // Should show recent call
        await expect(page1.locator('[data-testid="call-history-item"]')).toBeVisible();
        await expect(page1.locator('[data-testid="call-participant"]')).toContainText(testUsers.user2.username);
        await expect(page1.locator('[data-testid="call-type-voice"]')).toBeVisible();
        await expect(page1.locator('[data-testid="call-duration"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should show call notifications", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        await context1.grantPermissions(["camera", "microphone"]);
        await context2.grantPermissions(["camera", "microphone"]);

        // User 2 is on a different page
        await page2.goto("/dashboard/profile");

        // User 1 initiates call
        await helper1.startChat(testUsers.user2.username);
        await helper1.initiateVoiceCall(testUsers.user2.username);

        // Should show incoming call notification even on different page
        await expect(page2.locator('[data-testid="incoming-call-notification"]')).toBeVisible({ timeout: 5000 });
        
        // Should be able to answer from notification
        await page2.click('[data-testid="answer-from-notification"]');
        await expect(page2.locator('[data-testid="call-modal"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Mobile Call Features", () => {
    test("should adapt call interface for mobile", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const helper = new TestHelpers(page);

      try {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        await context.grantPermissions(["camera", "microphone"]);
        await helper.loginUser(testUsers.user1);
        await helper.startChat(testUsers.user2.username);

        // Initiate call
        await helper.initiateVoiceCall(testUsers.user2.username);

        // Should show mobile-optimized call interface
        await expect(page.locator('[data-testid="mobile-call-interface"]')).toBeVisible();
        
        // Call controls should be touch-friendly
        const callButtons = page.locator('[data-testid="call-controls"] button');
        const buttonCount = await callButtons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = callButtons.nth(i);
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            // Touch targets should be at least 44px
            expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
          }
        }

      } finally {
        await context.close();
      }
    });

    test("should handle device rotation during call", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const helper = new TestHelpers(page);

      try {
        await context.grantPermissions(["camera", "microphone"]);
        await helper.loginUser(testUsers.user1);
        await helper.startChat(testUsers.user2.username);

        // Start in portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await helper.initiateVoiceCall(testUsers.user2.username);

        // Rotate to landscape
        await page.setViewportSize({ width: 667, height: 375 });

        // Interface should adapt
        await expect(page.locator('[data-testid="landscape-call-interface"]')).toBeVisible();

        // Rotate back to portrait
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('[data-testid="portrait-call-interface"]')).toBeVisible();

      } finally {
        await context.close();
      }
    });
  });
});