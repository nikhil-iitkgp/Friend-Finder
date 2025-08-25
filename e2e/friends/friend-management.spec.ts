import { test, expect } from "@playwright/test";
import { testUsers, testLocations } from "../fixtures/test-data";
import TestHelpers, { setupFriendship } from "../fixtures/test-helpers";

test.describe("Friend Management", () => {
  test.describe("Friend Request Workflow", () => {
    test("should complete full friend request workflow between two users", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        // Login both users
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        // Setup GPS location for both users in same area
        await helper1.setupGPSLocation(testLocations.newyork);
        await helper2.setupGPSLocation(testLocations.newyork);

        // User 1: Discover nearby users
        await helper1.triggerDiscovery("gps");
        await expect(page1.locator('[data-testid="nearby-users-list"]')).toBeVisible();

        // User 1: Send friend request to User 2
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');
        await expect(page1.locator('[data-testid="request-sent-message"]')).toBeVisible();

        // Verify request status changes
        await expect(page1.locator(`[data-testid="user-card-${testUsers.user2.username}"] [data-testid="request-pending"]`)).toBeVisible();

        // User 2: Check friend requests
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friend-requests-tab"]');
        await expect(page2.locator(`[data-testid="friend-request-${testUsers.user1.username}"]`)).toBeVisible();

        // User 2: Accept friend request
        await page2.click(`[data-testid="friend-request-${testUsers.user1.username}"] [data-testid="accept-request"]`);
        await expect(page2.locator('[data-testid="request-accepted-message"]')).toBeVisible();

        // User 2: Verify User 1 appears in friends list
        await page2.click('[data-testid="friends-list-tab"]');
        await expect(page2.locator(`[data-testid="friend-${testUsers.user1.username}"]`)).toBeVisible();

        // User 1: Verify User 2 appears in friends list
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await expect(page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`)).toBeVisible();

        // Verify friendship status in discovery
        await helper1.triggerDiscovery("gps");
        await expect(page1.locator(`[data-testid="user-card-${testUsers.user2.username}"] [data-testid="friend-badge"]`)).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle friend request rejection", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        await helper1.setupGPSLocation(testLocations.newyork);
        await helper2.setupGPSLocation(testLocations.newyork);

        // User 1: Send friend request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // User 2: Reject friend request
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friend-requests-tab"]');
        await page2.click(`[data-testid="friend-request-${testUsers.user1.username}"] [data-testid="reject-request"]`);

        await expect(page2.locator('[data-testid="request-rejected-message"]')).toBeVisible();

        // Verify request is removed from list
        await expect(page2.locator(`[data-testid="friend-request-${testUsers.user1.username}"]`)).not.toBeVisible();

        // User 1: Verify can send request again
        await helper1.triggerDiscovery("gps");
        await expect(page1.locator(`[data-testid="user-card-${testUsers.user2.username}"] [data-testid="send-friend-request"]`)).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should prevent duplicate friend requests", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        await helper1.setupGPSLocation(testLocations.newyork);

        // Send first friend request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // Try to send another request
        await helper1.triggerDiscovery("gps");
        
        // Should show request pending, not send button
        await expect(page1.locator(`[data-testid="user-card-${testUsers.user2.username}"] [data-testid="request-pending"]`)).toBeVisible();
        await expect(page1.locator(`[data-testid="user-card-${testUsers.user2.username}"] [data-testid="send-friend-request"]`)).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle mutual friend requests", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        await helper1.setupGPSLocation(testLocations.newyork);
        await helper2.setupGPSLocation(testLocations.newyork);

        // Both users send friend requests simultaneously
        await Promise.all([
          (async () => {
            await helper1.triggerDiscovery("gps");
            await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
            await page1.click('[data-testid="send-friend-request"]');
          })(),
          (async () => {
            await helper2.triggerDiscovery("gps");
            await page2.click(`[data-testid="user-card-${testUsers.user1.username}"]`);
            await page2.click('[data-testid="send-friend-request"]');
          })()
        ]);

        // Should automatically become friends (or handle mutual request appropriately)
        await page1.goto("/dashboard/friends");
        await page2.goto("/dashboard/friends");

        // At least one should see the other as a friend or pending request
        const hasFriend1 = await page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`).isVisible();
        const hasRequest1 = await page1.locator(`[data-testid="friend-request-${testUsers.user2.username}"]`).isVisible();
        
        expect(hasFriend1 || hasRequest1).toBe(true);

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Friends List Management", () => {
    test("should display friends list with accurate information", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Setup friendship
        await setupFriendship(page1, page2);

        // Check friends list
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');

        const friendCard = page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`);
        await expect(friendCard).toBeVisible();

        // Verify friend information
        await expect(friendCard.locator('[data-testid="friend-username"]')).toContainText(testUsers.user2.username);
        await expect(friendCard.locator('[data-testid="friend-status"]')).toBeVisible();

        // Verify action buttons
        await expect(friendCard.locator('[data-testid="message-friend"]')).toBeVisible();
        await expect(friendCard.locator('[data-testid="call-friend"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should remove friend from list", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // Remove friend
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        
        const friendCard = page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`);
        await friendCard.locator('[data-testid="friend-options"]').click();
        await page1.click('[data-testid="remove-friend"]');

        // Confirm removal
        await page1.click('[data-testid="confirm-remove-friend"]');

        // Verify friend is removed
        await expect(friendCard).not.toBeVisible();

        // Verify User 2 also sees User 1 removed
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friends-list-tab"]');
        await expect(page2.locator(`[data-testid="friend-${testUsers.user1.username}"]`)).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should show online/offline status", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // Check online status
        await page1.goto("/dashboard/friends");
        const friendCard = page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`);
        
        // User 2 is online (has active session)
        await expect(friendCard.locator('[data-testid="online-indicator"]')).toBeVisible();

        // Simulate User 2 going offline
        await context2.close();
        await page1.reload();

        // Should show offline after some time
        await expect(friendCard.locator('[data-testid="offline-indicator"]')).toBeVisible({ timeout: 10000 });

      } finally {
        await context1.close();
      }
    });

    test("should filter friends by search", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');

        // Search for specific friend
        await page1.fill('[data-testid="friends-search"]', testUsers.user2.username);

        // Should show matching friend
        await expect(page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`)).toBeVisible();

        // Search for non-existent friend
        await page1.fill('[data-testid="friends-search"]', "nonexistent");
        await expect(page1.locator(`[data-testid="friend-${testUsers.user2.username}"]`)).not.toBeVisible();
        await expect(page1.locator('[data-testid="no-friends-found"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Friend Requests Management", () => {
    test("should show pending outgoing requests", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        await helper1.setupGPSLocation(testLocations.newyork);

        // Send friend request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // Check outgoing requests
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="outgoing-requests-tab"]');

        await expect(page1.locator(`[data-testid="outgoing-request-${testUsers.user2.username}"]`)).toBeVisible();
        await expect(page1.locator('[data-testid="cancel-request"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should cancel outgoing friend request", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        await helper1.setupGPSLocation(testLocations.newyork);

        // Send and then cancel request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="outgoing-requests-tab"]');
        await page1.click(`[data-testid="outgoing-request-${testUsers.user2.username}"] [data-testid="cancel-request"]`);

        // Confirm cancellation
        await page1.click('[data-testid="confirm-cancel-request"]');

        // Verify request is removed
        await expect(page1.locator(`[data-testid="outgoing-request-${testUsers.user2.username}"]`)).not.toBeVisible();

        // User 2 should not see the request anymore
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friend-requests-tab"]');
        await expect(page2.locator(`[data-testid="friend-request-${testUsers.user1.username}"]`)).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should show request timestamps", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        await helper1.setupGPSLocation(testLocations.newyork);

        // Send friend request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // Check timestamp in incoming requests
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friend-requests-tab"]');

        const requestCard = page2.locator(`[data-testid="friend-request-${testUsers.user1.username}"]`);
        await expect(requestCard.locator('[data-testid="request-timestamp"]')).toBeVisible();
        await expect(requestCard.locator('[data-testid="request-timestamp"]')).toContainText(/ago|now/);

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Friend Actions", () => {
    test("should start chat with friend", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // Start chat from friends list
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await page1.click(`[data-testid="friend-${testUsers.user2.username}"] [data-testid="message-friend"]`);

        // Should navigate to chat
        await expect(page1).toHaveURL(/\/dashboard\/chat/);
        await expect(page1.locator('[data-testid="chat-window"]')).toBeVisible();
        await expect(page1.locator(`[data-testid="chat-with-${testUsers.user2.username}"]`)).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should initiate call with friend", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // Grant media permissions
        await context1.grantPermissions(["camera", "microphone"]);

        // Start call from friends list
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await page1.click(`[data-testid="friend-${testUsers.user2.username}"] [data-testid="call-friend"]`);

        // Should open call modal
        await expect(page1.locator('[data-testid="call-modal"]')).toBeVisible();
        await expect(page1.locator('[data-testid="calling-user"]')).toContainText(testUsers.user2.username);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should view friend profile", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // View friend profile
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await page1.click(`[data-testid="friend-${testUsers.user2.username}"] [data-testid="view-profile"]`);

        // Should show friend's profile information
        await expect(page1.locator('[data-testid="profile-modal"]')).toBeVisible();
        await expect(page1.locator('[data-testid="profile-username"]')).toContainText(testUsers.user2.username);
        await expect(page1.locator('[data-testid="profile-bio"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Friendship Notifications", () => {
    test("should show notification for new friend request", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        await helper1.setupGPSLocation(testLocations.newyork);

        // User 2 should be on dashboard to receive notification
        await page2.goto("/dashboard");

        // User 1 sends friend request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // User 2 should see notification
        await expect(page2.locator('[data-testid="friend-request-notification"]')).toBeVisible({ timeout: 5000 });
        await expect(page2.locator('[data-testid="notification-badge"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should show notification for accepted friend request", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        await helper1.setupGPSLocation(testLocations.newyork);

        // Send request
        await helper1.triggerDiscovery("gps");
        await page1.click(`[data-testid="user-card-${testUsers.user2.username}"]`);
        await page1.click('[data-testid="send-friend-request"]');

        // User 1 should be on dashboard to receive notification
        await page1.goto("/dashboard");

        // Accept request
        await page2.goto("/dashboard/friends");
        await page2.click('[data-testid="friend-requests-tab"]');
        await page2.click(`[data-testid="friend-request-${testUsers.user1.username}"] [data-testid="accept-request"]`);

        // User 1 should see acceptance notification
        await expect(page1.locator('[data-testid="friend-accepted-notification"]')).toBeVisible({ timeout: 5000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});