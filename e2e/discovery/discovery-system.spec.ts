import { test, expect } from "@playwright/test";
import { testUsers, testLocations, testNetworks } from "../fixtures/test-data";
import TestHelpers from "../fixtures/test-helpers";

test.describe("Discovery System", () => {
  let helper: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelpers(page);
    await helper.loginUser(testUsers.user1);
  });

  test.describe("GPS Discovery", () => {
    test("should successfully discover nearby users using GPS", async ({ page, context }) => {
      // Grant geolocation permissions
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);

      await page.goto("/dashboard/discover");
      
      // Select GPS discovery mode
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Verify Google Maps is visible
      await expect(page.locator('[data-testid="google-map"]')).toBeVisible();
      
      // Trigger discovery
      await page.click('[data-testid="discover-button"]');
      
      // Wait for loading state
      await expect(page.locator('[data-testid="discovery-loading"]')).toBeVisible();
      
      // Wait for results
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible({
        timeout: 10000,
      });
      
      // Verify user markers on map
      await expect(page.locator('[data-testid="user-marker"]')).toHaveCount({ min: 0 });
    });

    test("should handle geolocation permission denied", async ({ page, context }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Mock geolocation permission denied
      await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          error({ code: 1, message: "Permission denied" });
        };
      });
      
      await page.click('[data-testid="discover-button"]');
      
      // Should show permission error
      await expect(page.locator('[data-testid="location-permission-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="location-permission-error"]')).toContainText("Permission denied");
    });

    test("should respect discovery radius settings", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Set custom radius
      await page.fill('[data-testid="discovery-radius-input"]', "1000"); // 1km
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
      
      // Verify radius is applied (check API call or UI indication)
      await expect(page.locator('[data-testid="discovery-radius-display"]')).toContainText("1.0 km");
    });

    test("should update location when user moves", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
      const initialUserCount = await page.locator('[data-testid="nearby-user-item"]').count();
      
      // Simulate location change
      await context.setGeolocation({
        latitude: testLocations.london.lat,
        longitude: testLocations.london.lng,
      });
      
      // Trigger discovery again
      await page.click('[data-testid="discover-button"]');
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
      
      // Results may change based on new location
      const newUserCount = await page.locator('[data-testid="nearby-user-item"]').count();
      // We can't guarantee count will be different, but location should update
      await expect(page.locator('[data-testid="current-location"]')).toContainText("London");
    });

    test("should handle GPS timeout and network errors", async ({ page, context }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Mock GPS timeout
      await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (success, error) => {
          setTimeout(() => {
            error({ code: 3, message: "Timeout" });
          }, 100);
        };
      });
      
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="location-timeout-error"]')).toBeVisible();
    });
  });

  test.describe("Wi-Fi Discovery", () => {
    test("should discover users on the same Wi-Fi network", async ({ page }) => {
      await helper.setupWiFiNetwork(testNetworks.office_wifi);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="wifi-discovery-tab"]');
      
      // Should show current network information
      await expect(page.locator('[data-testid="wifi-network-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-network-name"]')).toContainText(testNetworks.office_wifi.ssid);
      
      // Trigger discovery
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="discovery-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
      
      // Should show users on same network
      await expect(page.locator('[data-testid="wifi-network-badge"]')).toContainText(testNetworks.office_wifi.ssid);
    });

    test("should handle Wi-Fi not connected state", async ({ page }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="wifi-discovery-tab"]');
      
      // Mock no Wi-Fi connection
      await page.addInitScript(() => {
        // @ts-ignore
        window.mockWiFiNetwork = null;
      });
      
      await page.click('[data-testid="discover-button"]');
      
      // Should show not connected message
      await expect(page.locator('[data-testid="wifi-not-connected"]')).toBeVisible();
      await expect(page.locator('[data-testid="wifi-not-connected"]')).toContainText("Not connected to Wi-Fi");
    });

    test("should update when switching Wi-Fi networks", async ({ page }) => {
      await helper.setupWiFiNetwork(testNetworks.office_wifi);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="wifi-discovery-tab"]');
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
      
      // Simulate network change
      await page.addInitScript((newNetwork) => {
        // @ts-ignore
        window.mockWiFiNetwork = newNetwork;
      }, testNetworks.home_wifi);
      
      // Trigger discovery on new network
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="current-network-name"]')).toContainText(testNetworks.home_wifi.ssid);
    });

    test("should show signal strength information", async ({ page }) => {
      await helper.setupWiFiNetwork(testNetworks.office_wifi);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="wifi-discovery-tab"]');
      
      // Should display signal strength
      await expect(page.locator('[data-testid="signal-strength"]')).toBeVisible();
      await expect(page.locator('[data-testid="signal-strength"]')).toContainText(`${testNetworks.office_wifi.signalStrength} dBm`);
    });
  });

  test.describe("Bluetooth Discovery", () => {
    test("should discover nearby Bluetooth devices", async ({ page, context }) => {
      // Grant Bluetooth permissions (simulated)
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="bluetooth-discovery-tab"]');
      
      // Mock Bluetooth scan results
      await page.addInitScript(() => {
        // @ts-ignore
        window.mockBluetoothDevices = [
          { id: "AA:BB:CC:DD:EE:FF", name: "TestDevice1", rssi: -45 },
          { id: "11:22:33:44:55:66", name: "TestDevice2", rssi: -60 },
        ];
      });
      
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="bluetooth-scanning"]')).toBeVisible();
      await expect(page.locator('[data-testid="nearby-devices-list"]')).toBeVisible();
      
      // Should show discovered devices
      await expect(page.locator('[data-testid="bluetooth-device"]')).toHaveCount(2);
    });

    test("should handle Bluetooth not available", async ({ page }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="bluetooth-discovery-tab"]');
      
      // Mock Bluetooth not available
      await page.addInitScript(() => {
        // @ts-ignore
        navigator.bluetooth = undefined;
      });
      
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="bluetooth-not-available"]')).toBeVisible();
      await expect(page.locator('[data-testid="bluetooth-not-available"]')).toContainText("Bluetooth not available");
    });

    test("should handle Bluetooth permission denied", async ({ page }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="bluetooth-discovery-tab"]');
      
      // Mock permission denied
      await page.addInitScript(() => {
        // @ts-ignore
        navigator.bluetooth = {
          requestDevice: () => Promise.reject(new Error("Permission denied"))
        };
      });
      
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="bluetooth-permission-error"]')).toBeVisible();
    });

    test("should show device signal strength", async ({ page }) => {
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="bluetooth-discovery-tab"]');
      
      await page.addInitScript(() => {
        // @ts-ignore
        window.mockBluetoothDevices = [
          { id: "AA:BB:CC:DD:EE:FF", name: "TestDevice1", rssi: -45 },
        ];
      });
      
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="nearby-devices-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="device-signal-strength"]')).toContainText("-45 dBm");
    });
  });

  test.describe("Discovery Privacy Settings", () => {
    test("should respect user discoverability settings", async ({ page }) => {
      // First, disable discoverability
      await page.goto("/dashboard/profile");
      await page.uncheck('[data-testid="discoverable-toggle"]');
      await page.click('[data-testid="save-profile"]');
      
      // Go to discovery page
      await page.goto("/dashboard/discover");
      
      // Should show privacy notice
      await expect(page.locator('[data-testid="privacy-notice"]')).toBeVisible();
      await expect(page.locator('[data-testid="privacy-notice"]')).toContainText("You are not discoverable");
    });

    test("should allow enabling discoverability from discovery page", async ({ page }) => {
      await page.goto("/dashboard/discover");
      
      // If not discoverable, should show option to enable
      if (await page.locator('[data-testid="enable-discoverability"]').isVisible()) {
        await page.click('[data-testid="enable-discoverability"]');
        
        await expect(page.locator('[data-testid="discoverability-enabled"]')).toBeVisible();
      }
    });

    test("should respect discovery range limits", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      await page.goto("/dashboard/profile");
      
      // Set custom discovery range
      await page.fill('[data-testid="discovery-range-input"]', "1000"); // 1km
      await page.click('[data-testid="save-profile"]');
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Range should be reflected in discovery UI
      await expect(page.locator('[data-testid="max-range-display"]')).toContainText("1.0 km");
    });
  });

  test.describe("Discovery Performance", () => {
    test("should complete discovery within reasonable time", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      const discoveryTime = await helper.measureDiscoveryTime();
      
      // Discovery should complete within 5 seconds
      expect(discoveryTime).toBeLessThan(5000);
    });

    test("should handle rapid discovery requests", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // Trigger multiple rapid discoveries
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="discover-button"]');
        await page.waitForTimeout(100);
      }
      
      // Should handle gracefully without errors
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
    });

    test("should cache results for better performance", async ({ page, context }) => {
      await context.grantPermissions(["geolocation"]);
      await helper.setupGPSLocation(testLocations.newyork);
      
      await page.goto("/dashboard/discover");
      await page.click('[data-testid="gps-discovery-tab"]');
      
      // First discovery
      const firstDiscoveryTime = await helper.measureDiscoveryTime();
      
      // Second discovery (should be faster due to caching)
      const secondDiscoveryTime = await helper.measureDiscoveryTime();
      
      // Second discovery should be faster or at least not significantly slower
      expect(secondDiscoveryTime).toBeLessThanOrEqual(firstDiscoveryTime * 1.5);
    });
  });

  test.describe("Error Handling", () => {
    test("should handle API errors gracefully", async ({ page }) => {
      await page.goto("/dashboard/discover");
      
      // Mock API error
      await page.route("**/api/discovery/**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });
      
      await page.click('[data-testid="gps-discovery-tab"]');
      await page.click('[data-testid="discover-button"]');
      
      await expect(page.locator('[data-testid="discovery-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="discovery-error"]')).toContainText("Unable to discover nearby users");
    });

    test("should provide retry option on failure", async ({ page }) => {
      await page.goto("/dashboard/discover");
      
      // Mock initial failure
      let attemptCount = 0;
      await page.route("**/api/discovery/**", async (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          await route.fulfill({ status: 500 });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ users: [], total: 0 }),
          });
        }
      });
      
      await page.click('[data-testid="discover-button"]');
      await expect(page.locator('[data-testid="discovery-error"]')).toBeVisible();
      
      // Retry should work
      await page.click('[data-testid="retry-discovery"]');
      await expect(page.locator('[data-testid="nearby-users-list"]')).toBeVisible();
    });
  });
});