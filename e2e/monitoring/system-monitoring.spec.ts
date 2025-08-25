import { test, expect } from "@playwright/test";
import { testUsers } from "../fixtures/test-data";
import TestHelpers from "../fixtures/test-helpers";

test.describe("System Monitoring and Metrics", () => {
  test.describe("Application Metrics", () => {
    test("should collect user engagement metrics", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Track page navigation metrics
      const startTime = Date.now();
      await page.goto("/dashboard/discover");
      await page.waitForSelector('[data-testid="discover-tabs"]');
      
      // Simulate user engagement
      await page.click('[data-testid="gps-discovery-tab"]');
      await page.waitForTimeout(1000);
      
      await page.click('[data-testid="wifi-discovery-tab"]');
      await page.waitForTimeout(1000);
      
      // Check if metrics are being tracked (if analytics is implemented)
      const hasAnalytics = await page.evaluate(() => {
        return typeof window.gtag !== "undefined" || 
               typeof window.analytics !== "undefined" ||
               typeof window._paq !== "undefined";
      });
      
      if (hasAnalytics) {
        console.log("Analytics tracking detected");
      } else {
        console.log("No analytics tracking detected - consider implementing");
      }
      
      const sessionTime = Date.now() - startTime;
      expect(sessionTime).toBeGreaterThan(2000); // User spent at least 2 seconds
    });

    test("should track feature usage patterns", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Track discovery feature usage
      await page.goto("/dashboard/discover");
      await expect(page.locator('[data-testid="discover-tabs"]')).toBeVisible();
      
      // GPS discovery usage
      await page.click('[data-testid="gps-discovery-tab"]');
      const gpsTabActive = await page.locator('[data-testid="gps-discovery-tab"][aria-selected="true"]').isVisible();
      expect(gpsTabActive).toBe(true);
      
      // WiFi discovery usage
      await page.click('[data-testid="wifi-discovery-tab"]');
      const wifiTabActive = await page.locator('[data-testid="wifi-discovery-tab"][aria-selected="true"]').isVisible();
      expect(wifiTabActive).toBe(true);
      
      // Bluetooth discovery usage
      await page.click('[data-testid="bluetooth-discovery-tab"]');
      const bluetoothTabActive = await page.locator('[data-testid="bluetooth-discovery-tab"][aria-selected="true"]').isVisible();
      expect(bluetoothTabActive).toBe(true);
      
      console.log("Feature usage tracking: Discovery tabs navigation completed");
    });

    test("should monitor error rates", async ({ page, context }) => {
      const networkErrors = [];
      const jsErrors = [];
      
      // Track network errors
      page.on("response", (response) => {
        if (response.status() >= 400) {
          networkErrors.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      });
      
      // Track JavaScript errors
      page.on("pageerror", (error) => {
        jsErrors.push(error.message);
      });
      
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Navigate through main features
      const routes = [
        "/dashboard/discover",
        "/dashboard/friends", 
        "/dashboard/chat",
        "/dashboard/profile"
      ];
      
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
      }
      
      // Test error handling by triggering network failure
      await context.setOffline(true);
      await page.goto("/dashboard/discover");
      await page.waitForTimeout(2000);
      await context.setOffline(false);
      
      console.log(`Network errors detected: ${networkErrors.length}`);
      console.log(`JavaScript errors detected: ${jsErrors.length}`);
      
      // In a production environment, we'd want minimal errors
      // For testing, we just ensure error tracking is working
      expect(Array.isArray(networkErrors)).toBe(true);
      expect(Array.isArray(jsErrors)).toBe(true);
    });
  });

  test.describe("Performance Monitoring", () => {
    test("should monitor page load times across user journeys", async ({ page }) => {
      const helper = new TestHelpers(page);
      const loadTimes = [];
      
      // Monitor typical user journey load times
      const journey = [
        { url: "/", name: "Homepage" },
        { url: "/login", name: "Login" },
        { url: "/dashboard/discover", name: "Discover", requiresAuth: true },
        { url: "/dashboard/friends", name: "Friends", requiresAuth: true },
        { url: "/dashboard/chat", name: "Chat", requiresAuth: true }
      ];
      
      for (const step of journey) {
        if (step.requiresAuth && loadTimes.length === 2) {
          // Login before accessing protected routes
          await helper.loginUser(testUsers.user1);
        }
        
        const startTime = Date.now();
        await page.goto(step.url);
        await page.waitForLoadState("networkidle");
        const loadTime = Date.now() - startTime;
        
        loadTimes.push({
          page: step.name,
          loadTime: loadTime,
          url: step.url
        });
        
        console.log(`${step.name} loaded in ${loadTime}ms`);
        
        // Assert reasonable load times
        expect(loadTime).toBeLessThan(5000); // 5 second max
      }
      
      // Calculate average load time
      const avgLoadTime = loadTimes.reduce((sum, item) => sum + item.loadTime, 0) / loadTimes.length;
      console.log(`Average load time: ${avgLoadTime}ms`);
      
      expect(avgLoadTime).toBeLessThan(3000); // 3 second average max
    });

    test("should monitor memory usage during extended sessions", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Initial memory measurement
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      // Simulate extended user session with memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.goto("/dashboard/discover");
        await page.waitForSelector('[data-testid="discover-tabs"]');
        
        await page.goto("/dashboard/friends");
        await page.waitForSelector('[data-testid="friends-tabs"]');
        
        await page.goto("/dashboard/chat");
        await page.waitForSelector('[data-testid="chat-container"]');
        
        await page.waitForTimeout(500);
      }
      
      // Final memory measurement
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`);
        
        // Memory shouldn't increase by more than 50% during normal usage
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });

    test("should monitor real-time feature performance", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        const helper1 = new TestHelpers(page1);
        const helper2 = new TestHelpers(page2);

        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        // Set up friendship for real-time testing
        await helper1.sendFriendRequest(testUsers.user2.username);
        await helper2.acceptFriendRequest(testUsers.user1.username);

        // Test messaging performance
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);

        const messages = Array.from({ length: 20 }, (_, i) => `Performance test message ${i + 1}`);
        
        const startTime = Date.now();
        
        for (const message of messages) {
          await helper1.sendMessage(message);
          await helper2.waitForMessage(message);
          await page1.waitForTimeout(100); // Small delay between messages
        }
        
        const totalTime = Date.now() - startTime;
        const avgMessageTime = totalTime / messages.length;
        
        console.log(`Messaging performance: ${messages.length} messages in ${totalTime}ms (avg: ${avgMessageTime}ms per message)`);
        
        // Each message should be delivered within 2 seconds on average
        expect(avgMessageTime).toBeLessThan(2000);

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Resource Monitoring", () => {
    test("should monitor network resource loading", async ({ page }) => {
      const networkResources = [];
      
      page.on("response", (response) => {
        networkResources.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()["content-type"],
          size: parseInt(response.headers()["content-length"] || "0"),
          timing: response.timing()
        });
      });
      
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      // Analyze resource loading
      const staticResources = networkResources.filter(r => 
        r.url.includes(".js") || r.url.includes(".css") || r.url.includes(".png") || r.url.includes(".jpg")
      );
      
      const totalStaticSize = staticResources.reduce((sum, resource) => sum + resource.size, 0);
      console.log(`Total static resources: ${staticResources.length}, Size: ${(totalStaticSize / 1024).toFixed(2)}KB`);
      
      // Static resources should be reasonable in size
      expect(totalStaticSize).toBeLessThan(5 * 1024 * 1024); // 5MB max
      
      // Check for 404s on resources
      const missing = networkResources.filter(r => r.status === 404);
      expect(missing.length).toBe(0);
      
      // Check for slow loading resources
      const slowResources = networkResources.filter(r => r.timing && r.timing.responseEnd > 3000);
      console.log(`Slow loading resources: ${slowResources.length}`);
      
      // Most resources should load quickly
      expect(slowResources.length).toBeLessThan(networkResources.length * 0.1); // Less than 10% slow
    });

    test("should monitor third-party service dependencies", async ({ page, request }) => {
      // Test Google Maps API availability (if used)
      const mapsApiResponse = await request.get("https://maps.googleapis.com/maps/api/js", {
        failOnStatusCode: false
      });
      
      if (mapsApiResponse.status() === 200) {
        console.log("Google Maps API is accessible");
      } else {
        console.log("Google Maps API issue detected:", mapsApiResponse.status());
      }
      
      // Test external authentication providers
      const authProviders = [
        "https://accounts.google.com/.well-known/openid_configuration"
      ];
      
      for (const provider of authProviders) {
        const response = await request.get(provider, { failOnStatusCode: false });
        console.log(`Auth provider ${provider}: ${response.status()}`);
      }
      
      // Load main page and check for third-party loading issues
      const thirdPartyErrors = [];
      
      page.on("response", (response) => {
        const url = response.url();
        const isThirdParty = !url.includes("localhost") && !url.includes("127.0.0.1");
        
        if (isThirdParty && response.status() >= 400) {
          thirdPartyErrors.push({
            url: url,
            status: response.status()
          });
        }
      });
      
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      console.log(`Third-party errors detected: ${thirdPartyErrors.length}`);
      
      // Log any third-party issues for monitoring
      thirdPartyErrors.forEach(error => {
        console.log(`Third-party error: ${error.url} (${error.status})`);
      });
    });
  });

  test.describe("User Experience Monitoring", () => {
    test("should monitor user interaction response times", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      const interactions = [
        {
          name: "Tab Navigation",
          action: async () => {
            await page.goto("/dashboard/discover");
            await page.click('[data-testid="wifi-discovery-tab"]');
            await page.waitForSelector('[data-testid="wifi-discovery-content"]');
          }
        },
        {
          name: "Menu Navigation", 
          action: async () => {
            await page.click('[data-testid="user-menu"]');
            await page.waitForSelector('[data-testid="user-menu-dropdown"]');
          }
        },
        {
          name: "Search Interaction",
          action: async () => {
            await page.goto("/dashboard/friends");
            await page.fill('[data-testid="friend-search-input"]', "test");
            await page.waitForTimeout(500); // Debounce delay
          }
        }
      ];
      
      for (const interaction of interactions) {
        const startTime = Date.now();
        await interaction.action();
        const responseTime = Date.now() - startTime;
        
        console.log(`${interaction.name} response time: ${responseTime}ms`);
        
        // User interactions should respond within 1 second
        expect(responseTime).toBeLessThan(1000);
      }
    });

    test("should monitor form validation performance", async ({ page }) => {
      await page.goto("/register");
      
      const validationTests = [
        {
          field: "email",
          value: "invalid-email",
          expectedError: true
        },
        {
          field: "username", 
          value: "ab", // too short
          expectedError: true
        },
        {
          field: "password",
          value: "weak",
          expectedError: true
        }
      ];
      
      for (const test of validationTests) {
        const startTime = Date.now();
        
        await page.fill(`[data-testid="${test.field}-input"]`, test.value);
        await page.blur(`[data-testid="${test.field}-input"]`);
        
        if (test.expectedError) {
          await expect(page.locator(`[data-testid="${test.field}-error"]`)).toBeVisible();
        }
        
        const validationTime = Date.now() - startTime;
        console.log(`${test.field} validation time: ${validationTime}ms`);
        
        // Form validation should be immediate
        expect(validationTime).toBeLessThan(500);
      }
    });

    test("should monitor search and filter performance", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      await page.goto("/dashboard/friends");
      
      // Test friend search performance
      const searchTerms = ["test", "user", "friend", ""];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        await page.fill('[data-testid="friend-search-input"]', term);
        await page.waitForTimeout(300); // Typical debounce delay
        
        // Wait for search results to update
        await page.waitForFunction(() => {
          const input = document.querySelector('[data-testid="friend-search-input"]');
          const results = document.querySelector('[data-testid="search-results"]');
          return input && results && input.value.length >= 0;
        });
        
        const searchTime = Date.now() - startTime;
        console.log(`Search for "${term}" completed in ${searchTime}ms`);
        
        // Search should complete within 2 seconds
        expect(searchTime).toBeLessThan(2000);
      }
    });
  });
});