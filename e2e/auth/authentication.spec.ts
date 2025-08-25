import { test, expect } from "@playwright/test";
import { testUsers, generateRandomUser } from "../fixtures/test-data";
import TestHelpers from "../fixtures/test-helpers";

test.describe("Authentication Flow", () => {
  let helper: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helper = new TestHelpers(page);
  });

  test.describe("Registration", () => {
    test("should successfully register a new user and redirect to dashboard", async ({ page }) => {
      const newUser = generateRandomUser();
      
      await page.goto("/register");
      
      // Fill registration form
      await page.fill('[data-testid="username-input"]', newUser.username);
      await page.fill('[data-testid="email-input"]', newUser.email);
      await page.fill('[data-testid="password-input"]', newUser.password);
      await page.fill('[data-testid="confirm-password-input"]', newUser.password);
      
      // Submit form
      await page.click('[data-testid="register-button"]');
      
      // Verify redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Verify user is logged in
      await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible();
    });

    test("should show validation errors for invalid registration data", async ({ page }) => {
      await page.goto("/register");
      
      // Test invalid email
      await page.fill('[data-testid="email-input"]', "invalid-email");
      await page.fill('[data-testid="username-input"]', "testuser");
      await page.fill('[data-testid="password-input"]', "password123");
      await page.fill('[data-testid="confirm-password-input"]', "password123");
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      
      // Test short username
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="username-input"]', "ab"); // Too short
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="username-error"]')).toBeVisible();
      
      // Test password mismatch
      await page.fill('[data-testid="username-input"]', "testuser");
      await page.fill('[data-testid="password-input"]', "password123");
      await page.fill('[data-testid="confirm-password-input"]', "different123");
      await page.click('[data-testid="register-button"]');
      
      await expect(page.locator('[data-testid="confirm-password-error"]')).toBeVisible();
    });

    test("should prevent registration with existing email", async ({ page }) => {
      await page.goto("/register");
      
      // Try to register with existing user email
      await page.fill('[data-testid="username-input"]', "newuser");
      await page.fill('[data-testid="email-input"]', testUsers.user1.email);
      await page.fill('[data-testid="password-input"]', "Password123!");
      await page.fill('[data-testid="confirm-password-input"]', "Password123!");
      await page.click('[data-testid="register-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="registration-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="registration-error"]')).toContainText("already exists");
    });
  });

  test.describe("Login", () => {
    test("should successfully login with valid credentials", async ({ page }) => {
      await helper.loginUser(testUsers.user1);
      
      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      
      await page.fill('[data-testid="email-input"]', testUsers.user1.email);
      await page.fill('[data-testid="password-input"]', "wrongpassword");
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-error"]')).toContainText("Invalid credentials");
    });

    test("should show validation errors for empty fields", async ({ page }) => {
      await page.goto("/login");
      
      // Try to submit empty form
      await page.click('[data-testid="login-button"]');
      
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test("should remember login state after page refresh", async ({ page }) => {
      await helper.loginUser(testUsers.user1);
      
      // Refresh the page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="user-profile-menu"]')).toBeVisible();
    });
  });

  test.describe("Google OAuth Authentication", () => {
    test("should redirect to Google OAuth and handle successful authentication", async ({ page }) => {
      await page.goto("/login");
      
      // Mock successful Google OAuth response
      await page.route("**/api/auth/signin/google", async (route) => {
        await route.fulfill({
          status: 302,
          headers: { 
            Location: "/dashboard",
            "Set-Cookie": "next-auth.session-token=mock-session-token; Path=/; HttpOnly; SameSite=lax"
          },
        });
      });
      
      // Mock session API response
      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "google-user-123",
              email: "googleuser@gmail.com",
              name: "Google User",
              image: "https://lh3.googleusercontent.com/mock-image",
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });
      
      await page.click('[data-testid="google-login-button"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should handle Google OAuth cancellation", async ({ page }) => {
      await page.goto("/login");
      
      // Mock OAuth cancellation
      await page.route("**/api/auth/signin/google", async (route) => {
        await route.fulfill({
          status: 302,
          headers: { Location: "/login?error=OAuthSignInError" },
        });
      });
      
      await page.click('[data-testid="google-login-button"]');
      
      // Should stay on login page with error
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="oauth-error"]')).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test("should successfully logout and redirect to login page", async ({ page }) => {
      await helper.loginUser(testUsers.user1);
      
      await helper.logout();
      
      // Verify redirect to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Verify user menu is no longer visible
      await expect(page.locator('[data-testid="user-profile-menu"]')).not.toBeVisible();
    });

    test("should clear user session after logout", async ({ page }) => {
      await helper.loginUser(testUsers.user1);
      await helper.logout();
      
      // Try to access protected route
      await page.goto("/dashboard/profile");
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Session Management", () => {
    test("should redirect unauthenticated users to login", async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = [
        "/dashboard",
        "/dashboard/discover", 
        "/dashboard/profile",
        "/dashboard/chat",
        "/dashboard/friends",
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/login/);
      }
    });

    test("should handle expired session gracefully", async ({ page }) => {
      await helper.loginUser(testUsers.user1);
      
      // Mock expired session
      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}), // Empty session = expired
        });
      });
      
      // Refresh page to trigger session check
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should maintain session across tabs", async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      const helper1 = new TestHelpers(page1);
      
      // Login in first tab
      await helper1.loginUser(testUsers.user1);
      
      // Open dashboard in second tab
      await page2.goto("/dashboard");
      
      // Should be logged in in both tabs
      await expect(page1.locator('[data-testid="user-profile-menu"]')).toBeVisible();
      await expect(page2.locator('[data-testid="user-profile-menu"]')).toBeVisible();
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe("Security", () => {
    test("should prevent XSS in login form", async ({ page }) => {
      await page.goto("/login");
      
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('[data-testid="email-input"]', xssPayload);
      await page.fill('[data-testid="password-input"]', "password");
      await page.click('[data-testid="login-button"]');
      
      // XSS should be escaped/prevented
      const emailValue = await page.inputValue('[data-testid="email-input"]');
      expect(emailValue).toBe(xssPayload); // Should be stored as text, not executed
      
      // No alert should be triggered
      page.on('dialog', async dialog => {
        throw new Error('Unexpected alert dialog: ' + dialog.message());
      });
    });

    test("should enforce HTTPS in production", async ({ page }) => {
      // This would be tested against production environment
      if (process.env.NODE_ENV === 'production') {
        await page.goto("/login");
        expect(page.url()).toMatch(/^https:/);
      }
    });

    test("should have proper CSRF protection", async ({ page }) => {
      await page.goto("/login");
      
      // Try to submit login form without proper CSRF token
      const response = await page.request.post("/api/auth/callback/credentials", {
        data: {
          email: testUsers.user1.email,
          password: testUsers.user1.password,
        },
      });
      
      // Should reject request without proper authentication
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper form labels and ARIA attributes", async ({ page }) => {
      await page.goto("/login");
      
      // Check for proper labels
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      
      // Check ARIA attributes
      const emailInput = page.locator('[data-testid="email-input"]');
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(emailInput).toHaveAttribute('type', 'email');
      
      const passwordInput = page.locator('[data-testid="password-input"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/login");
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Email input
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password input
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Login button
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
      
      // Should be able to submit with Enter
      await page.fill('[data-testid="email-input"]', testUsers.user1.email);
      await page.fill('[data-testid="password-input"]', testUsers.user1.password);
      await page.keyboard.press('Enter');
      
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});