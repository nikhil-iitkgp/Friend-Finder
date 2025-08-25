import { test, expect } from "@playwright/test";
import { testUsers, generateRandomUser } from "../fixtures/test-data";
import TestHelpers from "../fixtures/test-helpers";

test.describe("Security Tests", () => {
  test.describe("Cross-Site Scripting (XSS) Protection", () => {
    test("should prevent XSS in user profile fields", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "';alert('XSS');//",
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ];
      
      await page.goto("/dashboard/profile");
      
      for (const payload of xssPayloads) {
        // Test bio field
        await page.fill('[data-testid="bio-input"]', payload);
        await page.click('[data-testid="save-profile"]');
        
        // Wait for save to complete
        await expect(page.locator('[data-testid="profile-saved-message"]')).toBeVisible();
        
        // Reload page and verify XSS is prevented
        await page.reload();
        
        const bioValue = await page.inputValue('[data-testid="bio-input"]');
        // Should be escaped/sanitized, not executed
        expect(bioValue).toBe(payload);
        
        // Verify no script execution
        page.on('dialog', async dialog => {
          throw new Error(`Unexpected alert dialog: ${dialog.message()}`);
        });
        
        // Check displayed value is safe
        const displayedBio = await page.locator('[data-testid="bio-display"]').textContent();
        expect(displayedBio).not.toContain('<script>');
      }
    });

    test("should sanitize XSS in chat messages", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);
        
        const xssMessage = '<script>alert("XSS in chat")</script>';
        
        // Prevent any alert dialogs
        page2.on('dialog', async dialog => {
          throw new Error(`XSS executed: ${dialog.message()}`);
        });
        
        // Send XSS payload
        await helper1.sendMessage(xssMessage);
        
        // Verify message is displayed safely
        await expect(page2.locator('[data-testid="message-text"]')).toContainText(xssMessage);
        
        // Verify no script execution occurred
        const messageHtml = await page2.locator('[data-testid="message-text"]').innerHTML();
        expect(messageHtml).not.toContain('<script>');
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should prevent XSS in search functionality", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      await page.goto("/dashboard/friends");
      
      const xssSearch = '<img src=x onerror=alert("XSS")>';
      
      page.on('dialog', async dialog => {
        throw new Error(`XSS executed in search: ${dialog.message()}`);
      });
      
      await page.fill('[data-testid="friends-search"]', xssSearch);
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search input is safe
      const searchValue = await page.inputValue('[data-testid="friends-search"]');
      expect(searchValue).toBe(xssSearch);
      
      // Verify no script execution in search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test.describe("Cross-Site Request Forgery (CSRF) Protection", () => {
    test("should reject unauthenticated API requests", async ({ request }) => {
      const endpoints = [
        { method: 'POST', url: '/api/friends/request', data: { toUserId: 'user123' } },
        { method: 'PUT', url: '/api/profile', data: { bio: 'Updated bio' } },
        { method: 'POST', url: '/api/chat/start', data: { userId: 'user123' } },
        { method: 'DELETE', url: '/api/friends/user123' }
      ];
      
      for (const endpoint of endpoints) {
        const response = await request.fetch(endpoint.url, {
          method: endpoint.method,
          data: endpoint.data
        });
        
        // Should reject unauthorized requests
        expect([401, 403]).toContain(response.status());
      }
    });

    test("should validate origin header for sensitive operations", async ({ page, request }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Get session cookies
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      if (sessionCookie) {
        // Try request from different origin
        const response = await request.post('/api/friends/request', {
          data: { toUserId: 'user123' },
          headers: {
            'Origin': 'https://malicious-site.com',
            'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
          }
        });
        
        // Should reject cross-origin requests
        expect(response.status()).toBe(403);
      }
    });

    test("should require valid CSRF tokens for state-changing operations", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Intercept and modify requests to remove CSRF protection
      await page.route('**/api/profile', async (route) => {
        const request = route.request();
        const headers = await request.allHeaders();
        
        // Remove CSRF token if present
        delete headers['x-csrf-token'];
        delete headers['x-xsrf-token'];
        
        await route.continue({
          headers
        });
      });
      
      await page.goto('/dashboard/profile');
      await page.fill('[data-testid="bio-input"]', 'Updated without CSRF token');
      await page.click('[data-testid="save-profile"]');
      
      // Should show error or fail to save
      await expect(page.locator('[data-testid="csrf-error"]')).toBeVisible();
    });
  });

  test.describe("SQL Injection Protection", () => {
    test("should prevent SQL injection in authentication", async ({ request }) => {
      const sqlPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM users WHERE '1'='1'; --",
        "admin'/*",
        "' UNION SELECT * FROM users; --"
      ];
      
      for (const payload of sqlPayloads) {
        const response = await request.post('/api/auth/callback/credentials', {
          data: {
            email: payload,
            password: 'password'
          }
        });
        
        // Should handle SQL injection attempts safely
        expect([400, 401, 422]).toContain(response.status());
        
        const responseBody = await response.text();
        expect(responseBody.toLowerCase()).not.toContain('syntax error');
        expect(responseBody.toLowerCase()).not.toContain('mysql');
        expect(responseBody.toLowerCase()).not.toContain('postgresql');
      }
    });

    test("should prevent SQL injection in search queries", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      const sqlPayload = "'; DROP TABLE users; --";
      
      await page.goto('/dashboard/friends');
      await page.fill('[data-testid="friends-search"]', sqlPayload);
      
      // Search should not cause database errors
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Check for SQL error messages
      const pageContent = await page.textContent('body');
      expect(pageContent.toLowerCase()).not.toContain('sql');
      expect(pageContent.toLowerCase()).not.toContain('syntax error');
    });

    test("should safely handle special characters in user input", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      const specialChars = [
        "'; SELECT * FROM users; --",
        "\"; DROP TABLE users; --",
        "' OR 1=1; --",
        "\\\"; DELETE FROM users; --"
      ];
      
      await page.goto('/dashboard/profile');
      
      for (const chars of specialChars) {
        await page.fill('[data-testid="bio-input"]', chars);
        await page.click('[data-testid="save-profile"]');
        
        // Should save safely without database errors
        await expect(page.locator('[data-testid="profile-saved-message"]')).toBeVisible();
        
        // Verify data integrity
        await page.reload();
        const bioValue = await page.inputValue('[data-testid="bio-input"]');
        expect(bioValue).toBe(chars);
      }
    });
  });

  test.describe("Authentication Security", () => {
    test("should enforce strong password requirements", async ({ page }) => {
      await page.goto('/register');
      
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '111111',
        'qwerty',
        '123456789'
      ];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('[data-testid="username-input"]', 'testuser');
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', weakPassword);
        await page.fill('[data-testid="confirm-password-input"]', weakPassword);
        await page.click('[data-testid="register-button"]');
        
        // Should show password strength error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-error"]')).toContainText(/weak|strength|requirements/i);
      }
    });

    test("should prevent brute force attacks", async ({ page }) => {
      await page.goto('/login');
      
      const maxAttempts = 6;
      
      for (let i = 0; i < maxAttempts; i++) {
        await page.fill('[data-testid="email-input"]', testUsers.user1.email);
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        
        if (i < maxAttempts - 1) {
          await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
        }
      }
      
      // After multiple failed attempts, should show rate limiting
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
    });

    test("should secure session management", async ({ page, context }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Check session cookies
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      if (sessionCookie) {
        // Should have secure attributes
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.secure).toBe(true); // In production
        expect(sessionCookie.sameSite).toBe('Lax');
        
        // Should have reasonable expiration
        expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000);
      }
      
      // Test session timeout
      await page.goto('/dashboard/profile');
      
      // Simulate session expiration
      await context.clearCookies();
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should validate JWT tokens properly", async ({ page, request }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Test with malformed JWT
      const malformedTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'expired.token.here',
        ''
      ];
      
      for (const token of malformedTokens) {
        const response = await request.get('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Should reject invalid tokens
        expect(response.status()).toBe(401);
      }
    });
  });

  test.describe("Input Validation and Sanitization", () => {
    test("should validate email format strictly", async ({ page }) => {
      await page.goto('/register');
      
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user space@domain.com',
        'user@domain',
        'user@.com',
        'user@domain..com'
      ];
      
      for (const email of invalidEmails) {
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="username-input"]', 'testuser');
        await page.fill('[data-testid="password-input"]', 'Password123!');
        await page.fill('[data-testid="confirm-password-input"]', 'Password123!');
        await page.click('[data-testid="register-button"]');
        
        await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      }
    });

    test("should validate file uploads", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      await page.goto('/dashboard/profile');
      
      // Create malicious file content
      const maliciousFiles = [
        { name: 'script.js', content: 'alert("XSS")', type: 'application/javascript' },
        { name: 'malware.exe', content: 'binary content', type: 'application/octet-stream' },
        { name: 'large.txt', content: 'x'.repeat(10 * 1024 * 1024), type: 'text/plain' } // 10MB
      ];
      
      for (const file of maliciousFiles) {
        // Create file object
        await page.evaluate(({ name, content, type }) => {
          const dataTransfer = new DataTransfer();
          const file = new File([content], name, { type });
          dataTransfer.items.add(file);
          
          const input = document.querySelector('[data-testid="profile-picture-input"]') as HTMLInputElement;
          if (input) {
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, file);
        
        // Should show validation error
        await expect(page.locator('[data-testid="file-validation-error"]')).toBeVisible();
      }
    });

    test("should prevent path traversal attacks", async ({ request }) => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const payload of pathTraversalPayloads) {
        const response = await request.get(`/api/files/${payload}`);
        
        // Should not allow path traversal
        expect([400, 403, 404]).toContain(response.status());
      }
    });
  });

  test.describe("API Security", () => {
    test("should enforce rate limiting on API endpoints", async ({ request }) => {
      const endpoints = [
        '/api/discovery/gps',
        '/api/friends/request',
        '/api/auth/register',
        '/api/chat/start'
      ];
      
      for (const endpoint of endpoints) {
        // Make rapid requests
        const requests = [];
        for (let i = 0; i < 20; i++) {
          requests.push(request.post(endpoint, { data: {} }));
        }
        
        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimitedCount = responses.filter(r => r.status() === 429).length;
        expect(rateLimitedCount).toBeGreaterThan(0);
      }
    });

    test("should validate API request content types", async ({ request }) => {
      const response = await request.post('/api/profile', {
        headers: {
          'Content-Type': 'text/plain'
        },
        data: 'not json'
      });
      
      // Should reject non-JSON content for JSON endpoints
      expect(response.status()).toBe(400);
    });

    test("should implement proper CORS policies", async ({ request }) => {
      const response = await request.options('/api/profile', {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      const corsHeader = response.headers()['access-control-allow-origin'];
      
      // Should not allow arbitrary origins
      expect(corsHeader).not.toBe('*');
      expect(corsHeader).not.toBe('https://malicious-site.com');
    });
  });

  test.describe("Data Privacy and Protection", () => {
    test("should not expose sensitive data in API responses", async ({ page, request }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Get user profile
      const response = await request.get('/api/profile');
      const data = await response.json();
      
      // Should not expose sensitive fields
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('passwordHash');
      expect(data).not.toHaveProperty('sessionToken');
      expect(data).not.toHaveProperty('refreshToken');
      
      // Check for accidental exposure in nested objects
      const jsonString = JSON.stringify(data);
      expect(jsonString.toLowerCase()).not.toContain('password');
      expect(jsonString.toLowerCase()).not.toContain('token');
    });

    test("should sanitize error messages", async ({ request }) => {
      // Trigger various errors
      const errorRequests = [
        request.get('/api/nonexistent'),
        request.post('/api/profile', { data: { invalid: 'data' } }),
        request.get('/api/profile/invalid-id')
      ];
      
      const responses = await Promise.all(errorRequests);
      
      for (const response of responses) {
        const errorText = await response.text();
        
        // Should not expose internal paths or technical details
        expect(errorText).not.toMatch(/\/[a-zA-Z]:/); // Windows paths
        expect(errorText).not.toMatch(/\/[a-zA-Z]+\/[a-zA-Z]+/); // Unix paths
        expect(errorText).not.toContain('mongoose');
        expect(errorText).not.toContain('mongodb');
        expect(errorText).not.toContain('node_modules');
      }
    });

    test("should implement proper access controls", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);
      
      try {
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user2);
        
        // User 1 tries to access User 2's private data
        const response = await page1.request.get(`/api/users/${testUsers.user2.email}/private`);
        
        // Should deny access to other users' private data
        expect([403, 404]).toContain(response.status());
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Content Security Policy", () => {
    test("should enforce proper CSP headers", async ({ page }) => {
      const response = await page.goto('/');
      
      const cspHeader = response?.headers()['content-security-policy'];
      
      if (cspHeader) {
        // Should restrict script sources
        expect(cspHeader).toContain("script-src");
        expect(cspHeader).not.toContain("'unsafe-eval'");
        
        // Should restrict style sources
        expect(cspHeader).toContain("style-src");
        
        // Should restrict frame sources
        expect(cspHeader).toContain("frame-src");
      }
    });

    test("should block inline scripts when CSP is enabled", async ({ page }) => {
      await page.goto('/');
      
      // Try to inject inline script
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.innerHTML = 'window.cspTestExecuted = true;';
        document.head.appendChild(script);
      });
      
      // Wait a bit for potential execution
      await page.waitForTimeout(1000);
      
      // Check if script was blocked
      const scriptExecuted = await page.evaluate(() => (window as any).cspTestExecuted);
      expect(scriptExecuted).toBeUndefined();
    });
  });

  test.describe("Secure Communication", () => {
    test("should enforce HTTPS in production", async ({ page }) => {
      // This test would typically run against production environment
      if (process.env.NODE_ENV === 'production') {
        await page.goto('/');
        expect(page.url()).toMatch(/^https:/);
        
        // Check for HSTS header
        const response = await page.goto('/');
        const hstsHeader = response?.headers()['strict-transport-security'];
        expect(hstsHeader).toBeDefined();
      }
    });

    test("should use secure WebSocket connections", async ({ page }) => {
      const helper = new TestHelpers(page);
      await helper.loginUser(testUsers.user1);
      
      // Monitor WebSocket connections
      const wsConnections: string[] = [];
      
      page.on('websocket', ws => {
        wsConnections.push(ws.url());
      });
      
      await page.goto('/dashboard/chat');
      
      // Wait for WebSocket connection
      await page.waitForTimeout(2000);
      
      // In production, should use wss://
      if (process.env.NODE_ENV === 'production') {
        wsConnections.forEach(url => {
          expect(url).toMatch(/^wss:/);
        });
      }
    });
  });

  test.describe("Security Headers", () => {
    test("should include security headers", async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};
      
      // Should include X-Frame-Options
      expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']);
      
      // Should include X-Content-Type-Options
      expect(headers['x-content-type-options']).toBe('nosniff');
      
      // Should include X-XSS-Protection
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      
      // Should include Referrer-Policy
      expect(headers['referrer-policy']).toBeDefined();
    });

    test("should not expose server information", async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};
      
      // Should not expose server details
      expect(headers['server']).toBeUndefined();
      expect(headers['x-powered-by']).toBeUndefined();
    });
  });
});