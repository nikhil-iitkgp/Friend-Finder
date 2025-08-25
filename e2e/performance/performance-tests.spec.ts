import { test, expect } from "@playwright/test";
import { testUsers, testLocations, testMessages } from "../fixtures/test-data";
import TestHelpers, { setupFriendship } from "../fixtures/test-helpers";

test.describe("Performance Tests", () => {
  test.describe("Page Load Performance", () => {
    test("should load landing page within performance budget", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      const loadTime = await helper.measurePageLoad("/");
      
      // Landing page should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Check for critical elements
      await expect(page.locator('[data-testid="hero-section"]')).toBeVisible({ timeout: 3000 });
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    });

    test("should load dashboard quickly after authentication", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      // Login first
      await helper.loginUser(testUsers.user1);
      
      // Measure dashboard load time
      const startTime = Date.now();
      await page.goto("/dashboard/discover");
      await expect(page.locator('[data-testid="discover-tabs"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Dashboard should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Verify critical dashboard elements load
      await expect(page.locator('[data-testid="navigation-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="top-bar"]')).toBeVisible();
    });

    test("should load chat interface efficiently", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      await helper.loginUser(testUsers.user1);
      
      const loadTime = await helper.measurePageLoad("/dashboard/chat");
      
      // Chat page should load within 2.5 seconds
      expect(loadTime).toBeLessThan(2500);
      
      // Verify chat components
      await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test("should handle multiple simultaneous page loads", async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);
      
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
      const helpers = pages.map(page => new TestHelpers(page));
      
      try {
        // Login all users simultaneously
        const loginPromises = helpers.map((helper, index) => 
          helper.loginUser(index === 0 ? testUsers.user1 : testUsers.user2)
        );
        
        const startTime = Date.now();
        await Promise.all(loginPromises);
        const totalTime = Date.now() - startTime;
        
        // All logins should complete within reasonable time
        expect(totalTime).toBeLessThan(5000);
        
        // Navigate to different pages simultaneously
        const navigationPromises = [
          helpers[0].measurePageLoad("/dashboard/discover"),
          helpers[1].measurePageLoad("/dashboard/friends"),
          helpers[2].measurePageLoad("/dashboard/profile")
        ];
        
        const navigationTimes = await Promise.all(navigationPromises);
        
        // Each page should load reasonably fast even under load
        navigationTimes.forEach(time => {
          expect(time).toBeLessThan(4000);
        });
        
      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
      }
    });
  });

  test.describe("Discovery Performance", () => {
    test("should complete GPS discovery within time limits", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      await helper.loginUser(testUsers.user1);
      
      const discoveryTime = await helper.measureDiscoveryTime();
      
      // GPS discovery should complete within 5 seconds
      expect(discoveryTime).toBeLessThan(5000);
      
      // Verify results are displayed
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
    });

    test("should handle rapid consecutive discoveries", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      await helper.loginUser(testUsers.user1);
      await page.goto("/dashboard/discover");
      
      // Perform multiple rapid discoveries
      const discoveryTimes = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await page.click('[data-testid="discover-button"]');
        await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
        const endTime = Date.now();
        discoveryTimes.push(endTime - startTime);
        
        await page.waitForTimeout(500); // Small delay between discoveries
      }
      
      // Each discovery should be reasonably fast
      discoveryTimes.forEach((time, index) => {
        expect(time).toBeLessThan(7000); // Allow some variance for subsequent calls
      });
      
      // Later discoveries might be faster due to caching
      const averageTime = discoveryTimes.reduce((a, b) => a + b) / discoveryTimes.length;
      expect(averageTime).toBeLessThan(5000);
    });

    test("should efficiently switch between discovery modes", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      await helper.setupWiFiNetwork({ ssid: "TestNetwork", bssid: "AA:BB:CC:DD:EE:FF" });
      await helper.loginUser(testUsers.user1);
      await page.goto("/dashboard/discover");
      
      // Test switching between modes
      const modes = ["gps", "wifi", "bluetooth"];
      const switchTimes = [];
      
      for (const mode of modes) {
        const startTime = Date.now();
        await page.click(`[data-testid="${mode}-discovery-tab"]`);
        await expect(page.locator(`[data-testid="${mode}-discovery-content"]`)).toBeVisible();
        const endTime = Date.now();
        switchTimes.push(endTime - startTime);
      }
      
      // Mode switching should be instant
      switchTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
    });

    test("should handle large result sets efficiently", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      await helper.loginUser(testUsers.user1);
      
      // Mock large result set
      await page.route("**/api/discovery/gps", async (route) => {
        const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
          id: `user${i}`,
          username: `testuser${i}`,
          distance: Math.random() * 5000,
          profilePicture: null,
          lastSeen: new Date().toISOString(),
          isFriend: false,
          hasPendingRequest: false
        }));
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ users: largeResultSet, total: 100 })
        });
      });
      
      const discoveryTime = await helper.measureDiscoveryTime();
      
      // Should handle large results within reasonable time
      expect(discoveryTime).toBeLessThan(8000);
      
      // Should implement pagination or virtualization
      const userCards = await page.locator('[data-testid="nearby-user-item"]').count();
      expect(userCards).toBeLessThanOrEqual(20); // Should paginate large results
    });
  });

  test.describe("Messaging Performance", () => {
    test("should send messages quickly", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        // Measure single message delivery time
        const startTime = Date.now();
        await helper1.sendMessage(testMessages.greeting);
        await helper2.waitForMessage(testMessages.greeting);
        const deliveryTime = Date.now() - startTime;
        
        // Message should be delivered within 2 seconds
        expect(deliveryTime).toBeLessThan(2000);
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle rapid message sending", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        // Send 10 messages rapidly
        const messages = Array.from({ length: 10 }, (_, i) => `Message ${i + 1}`);
        
        const startTime = Date.now();
        for (const message of messages) {
          await page1.fill('[data-testid="message-input"]', message);
          await page1.press('[data-testid="message-input"]', "Enter");
          await page1.waitForTimeout(50); // Minimal delay
        }
        
        // Wait for all messages to be delivered
        for (const message of messages) {
          await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message })).toBeVisible();
        }
        
        const totalTime = Date.now() - startTime;
        
        // All messages should be sent and received within 10 seconds
        expect(totalTime).toBeLessThan(10000);
        
        // Average per message should be reasonable
        const averageTime = totalTime / messages.length;
        expect(averageTime).toBeLessThan(1000);
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should load chat history efficiently", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      await helper.loginUser(testUsers.user1);
      
      // Measure chat history loading
      const startTime = Date.now();
      await helper.startChat(testUsers.user2.username);
      
      // Wait for initial message load
      await expect(page.locator('[data-testid="chat-messages-container"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Chat history should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Test pagination performance
      const scrollStartTime = Date.now();
      await page.locator('[data-testid="chat-messages-container"]').scrollTo({ top: 0 });
      
      // Should show loading indicator quickly
      await expect(page.locator('[data-testid="loading-older-messages"]')).toBeVisible({ timeout: 1000 });
      
      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).toBeLessThan(1000);
    });

    test("should handle typing indicators efficiently", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        // Test typing indicator response time
        const startTime = Date.now();
        await page1.fill('[data-testid="message-input"]', "Typing...");
        await expect(page2.locator('[data-testid="typing-indicator"]')).toBeVisible();
        const indicatorTime = Date.now() - startTime;
        
        // Typing indicator should appear within 500ms
        expect(indicatorTime).toBeLessThan(500);
        
        // Test rapid typing updates
        for (let i = 0; i < 10; i++) {
          await page1.fill('[data-testid="message-input"]', `Typing ${i}...`);
          await page1.waitForTimeout(100);
        }
        
        // Should not overwhelm the other user with updates
        // (Implementation should debounce rapid typing)
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Resource Usage Performance", () => {
    test("should not consume excessive memory", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      await helper.loginUser(testUsers.user1);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Perform memory-intensive operations
      await page.goto("/dashboard/discover");
      await helper.measureDiscoveryTime();
      await page.goto("/dashboard/chat");
      await helper.startChat(testUsers.user2.username);
      
      // Send many messages
      for (let i = 0; i < 50; i++) {
        await helper.sendMessage(`Memory test message ${i}`);
      }
      
      // Check memory usage after operations
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test("should handle multiple concurrent users efficiently", async ({ browser }) => {
      const concurrentUsers = 5;
      const contexts = await Promise.all(
        Array.from({ length: concurrentUsers }, () => browser.newContext())
      );
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
      
      try {
        // Simulate concurrent user activity
        const activities = pages.map(async (page, index) => {
          const helper = new TestHelpers(page);
          await helper.loginUser(index % 2 === 0 ? testUsers.user1 : testUsers.user2);
          
          // Perform various activities
          await page.goto("/dashboard/discover");
          await page.waitForTimeout(Math.random() * 2000);
          
          await page.goto("/dashboard/chat");
          await page.waitForTimeout(Math.random() * 1000);
          
          await page.goto("/dashboard/friends");
          await page.waitForTimeout(Math.random() * 1500);
        });
        
        const startTime = Date.now();
        await Promise.all(activities);
        const totalTime = Date.now() - startTime;
        
        // All concurrent activities should complete within reasonable time
        expect(totalTime).toBeLessThan(15000);
        
      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
      }
    });

    test("should optimize network requests", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      const networkRequests: string[] = [];
      
      // Monitor network requests
      page.on('request', request => {
        networkRequests.push(request.url());
      });
      
      await helper.loginUser(testUsers.user1);
      await page.goto("/dashboard/discover");
      
      // Wait for page to settle
      await page.waitForTimeout(3000);
      
      // Count API requests
      const apiRequests = networkRequests.filter(url => url.includes('/api/'));
      const staticRequests = networkRequests.filter(url => 
        url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.jpg')
      );
      
      // Should not make excessive API requests
      expect(apiRequests.length).toBeLessThan(10);
      
      // Should efficiently cache static resources
      const duplicateStatic = staticRequests.filter((url, index) => 
        staticRequests.indexOf(url) !== index
      );
      expect(duplicateStatic.length).toBe(0); // No duplicate static resource requests
    });
  });

  test.describe("Mobile Performance", () => {
    test("should perform well on mobile viewport", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile performance
      const mobileLoadTime = await helper.measurePageLoad("/");
      
      // Mobile should load within 3 seconds (accounting for slower devices)
      expect(mobileLoadTime).toBeLessThan(3000);
      
      await helper.loginUser(testUsers.user1);
      
      // Test mobile navigation performance
      const navigationStartTime = Date.now();
      await page.goto("/dashboard/discover");
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      const mobileNavTime = Date.now() - navigationStartTime;
      
      expect(mobileNavTime).toBeLessThan(2500);
    });

    test("should handle touch interactions smoothly", async ({ page }) => {
      const helper = new TestHelpers(page);
      
      await page.setViewportSize({ width: 375, height: 667 });
      await helper.loginUser(testUsers.user1);
      await page.goto("/dashboard/discover");
      
      // Test touch interaction response times
      const touchInteractions = [
        () => page.click('[data-testid="gps-discovery-tab"]'),
        () => page.click('[data-testid="wifi-discovery-tab"]'),
        () => page.click('[data-testid="bluetooth-discovery-tab"]')
      ];
      
      for (const interaction of touchInteractions) {
        const startTime = Date.now();
        await interaction();
        await page.waitForTimeout(100); // Wait for UI update
        const responseTime = Date.now() - startTime;
        
        // Touch responses should be immediate
        expect(responseTime).toBeLessThan(300);
      }
    });

    test("should optimize for slow network conditions", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      
      // Simulate slow 3G connection
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 200)); // Add 200ms delay
        await route.continue();
      });
      
      const slowNetworkTime = await helper.measurePageLoad("/");
      
      // Should still be usable on slow networks (within 5 seconds)
      expect(slowNetworkTime).toBeLessThan(5000);
      
      // Critical content should load first
      await expect(page.locator('[data-testid="logo"]')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe("Real-time Performance", () => {
    test("should maintain low latency for real-time features", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        // Test message latency
        const latencies = [];
        
        for (let i = 0; i < 5; i++) {
          const message = `Latency test ${i}`;
          const startTime = Date.now();
          
          await helper1.sendMessage(message);
          await helper2.waitForMessage(message);
          
          const latency = Date.now() - startTime;
          latencies.push(latency);
          
          await page1.waitForTimeout(1000); // Wait between tests
        }
        
        // Average latency should be under 500ms
        const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
        expect(avgLatency).toBeLessThan(500);
        
        // No latency should exceed 1 second
        latencies.forEach(latency => {
          expect(latency).toBeLessThan(1000);
        });
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle connection drops gracefully", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        // Test initial connectivity
        await helper1.sendMessage("Before disconnect");
        await helper2.waitForMessage("Before disconnect");
        
        // Simulate network interruption
        await context1.setOffline(true);
        await page1.waitForTimeout(2000);
        
        // Reconnect
        const reconnectStartTime = Date.now();
        await context1.setOffline(false);
        
        // Test reconnection time
        await expect(page1.locator('[data-testid="connection-status-online"]')).toBeVisible({ timeout: 10000 });
        const reconnectTime = Date.now() - reconnectStartTime;
        
        // Reconnection should be reasonably fast
        expect(reconnectTime).toBeLessThan(8000);
        
        // Test message delivery after reconnection
        await helper1.sendMessage("After reconnect");
        await helper2.waitForMessage("After reconnect");
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});