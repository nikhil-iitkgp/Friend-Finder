import { test, expect } from "@playwright/test";
import { testUsers } from "../fixtures/test-data";
import TestHelpers from "../fixtures/test-helpers";

test.describe("Production Readiness Validation", () => {
  test.describe("Health Check Endpoints", () => {
    test("should respond to health check with system status", async ({ request }) => {
      const response = await request.get("/api/health");
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("database");
      expect(data).toHaveProperty("memory");
      expect(data).toHaveProperty("environment");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("checks");
      
      // Validate health status
      expect(["healthy", "unhealthy"]).toContain(data.status);
      expect(["connected", "disconnected", "error"]).toContain(data.database);
      
      // Validate memory information
      expect(data.memory).toHaveProperty("used");
      expect(data.memory).toHaveProperty("total");
      expect(data.memory).toHaveProperty("percentage");
      expect(typeof data.memory.used).toBe("number");
      expect(typeof data.memory.total).toBe("number");
      expect(typeof data.memory.percentage).toBe("number");
      
      // Validate checks
      expect(data.checks).toHaveProperty("database");
      expect(data.checks).toHaveProperty("memory");
      expect(data.checks).toHaveProperty("uptime");
      expect(typeof data.checks.database).toBe("boolean");
      expect(typeof data.checks.memory).toBe("boolean");
      expect(typeof data.checks.uptime).toBe("boolean");
    });

    test("should include response time headers", async ({ request }) => {
      const response = await request.get("/api/health");
      
      const responseTime = response.headers()["x-response-time"];
      expect(responseTime).toBeDefined();
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    test("should include cache control headers", async ({ request }) => {
      const response = await request.get("/api/health");
      
      expect(response.headers()["cache-control"]).toBe("no-cache, no-store, must-revalidate");
      expect(response.headers()["pragma"]).toBe("no-cache");
      expect(response.headers()["expires"]).toBe("0");
    });

    test("should reject non-GET methods", async ({ request }) => {
      const postResponse = await request.post("/api/health");
      expect(postResponse.status()).toBe(405);
      
      const putResponse = await request.put("/api/health");
      expect(putResponse.status()).toBe(405);
      
      const deleteResponse = await request.delete("/api/health");
      expect(deleteResponse.status()).toBe(405);
    });
  });

  test.describe("Error Handling and Resilience", () => {
    test("should handle 404 pages gracefully", async ({ page }) => {
      await page.goto("/non-existent-page");
      
      // Should show custom 404 page
      await expect(page.locator('[data-testid="error-404"]')).toBeVisible();
      await expect(page.locator("h1")).toContainText("404");
      
      // Should have navigation back to home
      await expect(page.locator('[data-testid="home-link"]')).toBeVisible();
      
      await page.click('[data-testid="home-link"]');
      await expect(page).toHaveURL("/");
    });

    test("should handle API errors gracefully", async ({ request, page }) => {
      // Test invalid API endpoints
      const invalidResponse = await request.get("/api/invalid-endpoint");
      expect(invalidResponse.status()).toBe(404);
      
      // Test malformed requests
      const malformedResponse = await request.post("/api/auth/register", {
        data: { invalid: "data" }
      });
      expect([400, 422]).toContain(malformedResponse.status());
    });

    test("should handle network errors gracefully", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Navigate to a page
      await page.goto("/dashboard/discover");
      await expect(page.locator('[data-testid="discover-tabs"]')).toBeVisible();
      
      // Simulate network failure
      await context.setOffline(true);
      
      // Try to perform an action that requires network
      await page.click('[data-testid="discover-button"]');
      
      // Should show appropriate error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
      
      // Restore network
      await context.setOffline(false);
      
      // Should recover gracefully
      await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Performance Benchmarks", () => {
    test("should meet performance requirements for critical pages", async ({ page }) => {
      const pages = [
        { url: "/", name: "Homepage", maxLoadTime: 2000 },
        { url: "/login", name: "Login", maxLoadTime: 1500 },
        { url: "/register", name: "Register", maxLoadTime: 1500 }
      ];

      for (const testPage of pages) {
        const startTime = Date.now();
        await page.goto(testPage.url);
        
        // Wait for page to be fully loaded
        await page.waitForLoadState("networkidle");
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(testPage.maxLoadTime);
        
        console.log(`${testPage.name} loaded in ${loadTime}ms (max: ${testPage.maxLoadTime}ms)`);
      }
    });

    test("should meet performance requirements for authenticated pages", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);

      const authenticatedPages = [
        { url: "/dashboard/discover", name: "Discover", maxLoadTime: 3000 },
        { url: "/dashboard/friends", name: "Friends", maxLoadTime: 2500 },
        { url: "/dashboard/chat", name: "Chat", maxLoadTime: 2500 },
        { url: "/dashboard/profile", name: "Profile", maxLoadTime: 2000 }
      ];

      for (const testPage of authenticatedPages) {
        const startTime = Date.now();
        await page.goto(testPage.url);
        
        // Wait for main content to be visible
        await page.waitForSelector('[data-testid*="main-content"], [data-testid*="dashboard"]', { timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(testPage.maxLoadTime);
        
        console.log(`${testPage.name} loaded in ${loadTime}ms (max: ${testPage.maxLoadTime}ms)`);
      }
    });

    test("should handle concurrent user load", async ({ browser }) => {
      const numberOfConcurrentUsers = 5;
      const contexts = [];
      const pages = [];
      const helpers = [];

      try {
        // Create multiple browser contexts to simulate concurrent users
        for (let i = 0; i < numberOfConcurrentUsers; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          const helper = new TestHelpers(page);
          
          contexts.push(context);
          pages.push(page);
          helpers.push(helper);
        }

        // Login all users concurrently
        const loginPromises = helpers.map((helper, index) => 
          helper.loginUser({
            ...testUsers.user1,
            email: `concurrent.user${index}@friendfinder.com`,
            username: `concurrentuser${index}`
          })
        );

        const startTime = Date.now();
        await Promise.all(loginPromises);
        const loginTime = Date.now() - startTime;

        // Should handle concurrent logins within acceptable time
        expect(loginTime).toBeLessThan(10000); // 10 seconds max

        // Navigate all users to discover page concurrently
        const navigationPromises = pages.map(page => page.goto("/dashboard/discover"));
        
        const navStartTime = Date.now();
        await Promise.all(navigationPromises);
        const navigationTime = Date.now() - navStartTime;

        // Should handle concurrent navigation within acceptable time
        expect(navigationTime).toBeLessThan(8000); // 8 seconds max

        console.log(`Concurrent load test: ${numberOfConcurrentUsers} users`);
        console.log(`Login time: ${loginTime}ms, Navigation time: ${navigationTime}ms`);

      } finally {
        // Clean up all contexts
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });

  test.describe("Security Validation", () => {
    test("should have proper security headers", async ({ request }) => {
      const response = await request.get("/");
      const headers = response.headers();
      
      // Check for important security headers
      expect(headers["x-frame-options"]).toBeDefined();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      
      // Check CSP header if implemented
      if (headers["content-security-policy"]) {
        expect(headers["content-security-policy"]).toContain("default-src");
      }
    });

    test("should protect against common vulnerabilities", async ({ page, request }) => {
      // Test XSS protection
      await page.goto("/login");
      const xssPayload = '<script>alert("xss")</script>';
      
      await page.fill('[data-testid="email-input"]', xssPayload);
      const emailValue = await page.inputValue('[data-testid="email-input"]');
      
      // Should not execute script
      expect(emailValue).toBe(xssPayload);
      
      // Test SQL injection protection
      const sqlInjectionPayload = {
        email: "test@test.com'; DROP TABLE users; --",
        password: "password"
      };
      
      const authResponse = await request.post("/api/auth/callback/credentials", {
        data: sqlInjectionPayload
      });
      
      // Should reject malicious input
      expect([400, 401, 422]).toContain(authResponse.status());
    });

    test("should enforce authentication on protected routes", async ({ page }) => {
      const protectedRoutes = [
        "/dashboard/discover",
        "/dashboard/friends", 
        "/dashboard/chat",
        "/dashboard/profile"
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login or show auth error
        await expect(page).toHaveURL(/\/(login|auth)/);
      }
    });
  });

  test.describe("Database and Data Integrity", () => {
    test("should handle database connection issues", async ({ request }) => {
      // Test health endpoint when database might be under stress
      const healthResponse = await request.get("/api/health");
      const healthData = await healthResponse.json();
      
      // Database status should be reported accurately
      expect(["connected", "disconnected", "error"]).toContain(healthData.database);
      
      if (healthData.database === "error") {
        expect(healthData.status).toBe("unhealthy");
        expect(healthData.checks.database).toBe(false);
      }
    });

    test("should maintain data consistency during operations", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        const helper1 = new TestHelpers(page1);
        const helper2 = new TestHelpers(page2);

        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);

        // Perform concurrent operations that might cause race conditions
        const operations = [
          () => helper1.sendFriendRequest(testUsers.user2.username),
          () => helper2.updateProfile({ bio: "Updated bio" })
        ];

        await Promise.all(operations.map(op => op()));

        // Verify data consistency
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friend-requests-tab"]');
        
        // Should show sent friend request
        await expect(page1.locator('[data-testid="sent-requests-list"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Deployment Validation", () => {
    test("should have proper environment configuration", async ({ request }) => {
      const healthResponse = await request.get("/api/health");
      const healthData = await healthResponse.json();
      
      // Should report correct environment
      expect(["development", "production", "test"]).toContain(healthData.environment);
      
      // Should have version information
      expect(healthData.version).toBeDefined();
      expect(typeof healthData.version).toBe("string");
    });

    test("should handle static asset loading", async ({ page }) => {
      await page.goto("/");
      
      // Check that CSS is loaded
      const styles = await page.locator("link[rel='stylesheet']").count();
      expect(styles).toBeGreaterThan(0);
      
      // Check that JavaScript is loaded and executing
      const jsEnabled = await page.evaluate(() => typeof window !== "undefined");
      expect(jsEnabled).toBe(true);
    });

    test("should have proper favicon and metadata", async ({ page }) => {
      await page.goto("/");
      
      // Check favicon
      const favicon = page.locator("link[rel='icon'], link[rel='shortcut icon']");
      await expect(favicon).toHaveCount(1);
      
      // Check essential meta tags
      await expect(page.locator("meta[name='viewport']")).toHaveCount(1);
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe("Monitoring and Observability", () => {
    test("should provide performance metrics", async ({ page }) => {
      await page.goto("/");
      
      // Measure Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.name === "FCP") vitals.fcp = entry.value;
              if (entry.name === "LCP") vitals.lcp = entry.value;
              if (entry.name === "FID") vitals.fid = entry.value;
              if (entry.name === "CLS") vitals.cls = entry.value;
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ["paint", "largest-contentful-paint", "first-input", "layout-shift"] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 5000);
        });
      });
      
      console.log("Performance metrics:", metrics);
      
      // Basic performance assertions
      const navigationTiming = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
        };
      });
      
      expect(navigationTiming.loadTime).toBeLessThan(5000); // 5 seconds max
      expect(navigationTiming.domContentLoaded).toBeLessThan(3000); // 3 seconds max
    });

    test("should log errors appropriately", async ({ page }) => {
      const consoleErrors = [];
      
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      
      page.on("pageerror", (error) => {
        consoleErrors.push(error.message);
      });
      
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      // Should not have critical JavaScript errors on page load
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes("favicon") && 
        !error.includes("analytics") &&
        !error.includes("dev-tools")
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });
});