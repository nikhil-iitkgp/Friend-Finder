import { test, expect } from "@playwright/test";
import { testUsers, testMessages } from "../fixtures/test-data";
import TestHelpers, { setupFriendship, setupChatSession } from "../fixtures/test-helpers";

test.describe("Real-time Messaging", () => {
  test.describe("Chat Interface", () => {
    test("should display chat window with conversation history", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      try {
        const helper1 = new TestHelpers(page1);
        await helper1.loginUser(testUsers.user1);
        
        await page1.goto("/dashboard/chat");
        
        // Should show empty state initially
        await expect(page1.locator('[data-testid="chat-empty-state"]')).toBeVisible();
        
        // Should show conversation list
        await expect(page1.locator('[data-testid="conversation-list"]')).toBeVisible();
        
      } finally {
        await context1.close();
      }
    });

    test("should start new conversation from friends list", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        await setupFriendship(page1, page2);

        // Start chat from friends page
        await page1.goto("/dashboard/friends");
        await page1.click('[data-testid="friends-list-tab"]');
        await page1.click(`[data-testid="friend-${testUsers.user2.username}"] [data-testid="message-friend"]`);

        // Should navigate to chat with conversation open
        await expect(page1).toHaveURL(/\/dashboard\/chat/);
        await expect(page1.locator('[data-testid="chat-window"]')).toBeVisible();
        await expect(page1.locator(`[data-testid="chat-header-${testUsers.user2.username}"]`)).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Real-time Message Exchange", () => {
    test("should send and receive messages in real-time", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);

        // Both users open chat
        await helper1.startChat(testUsers.user2.username);
        await helper2.startChat(testUsers.user1.username);

        // User 1 sends message
        const message1 = testMessages.greeting;
        await helper1.sendMessage(message1);

        // Verify message appears for both users
        await expect(page1.locator(`[data-testid="message-text"]`).filter({ hasText: message1 })).toBeVisible();
        await helper2.waitForMessage(message1);

        // User 2 replies
        const message2 = testMessages.followup;
        await helper2.sendMessage(message2);

        // Verify reply appears for both users
        await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message2 })).toBeVisible();
        await helper1.waitForMessage(message2);

        // Verify message order
        const messages1 = await page1.locator('[data-testid="message-text"]').allTextContents();
        const messages2 = await page2.locator('[data-testid="message-text"]').allTextContents();
        
        expect(messages1).toEqual([message1, message2]);
        expect(messages2).toEqual([message1, message2]);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle message persistence and history", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);

        // Send multiple messages
        await helper1.startChat(testUsers.user2.username);
        
        const messages = [
          testMessages.greeting,
          testMessages.followup,
          testMessages.emoji
        ];

        for (const message of messages) {
          await helper1.sendMessage(message);
          await page1.waitForTimeout(500); // Slight delay between messages
        }

        // User 2 opens chat and should see all messages
        await helper2.startChat(testUsers.user1.username);
        
        for (const message of messages) {
          await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message })).toBeVisible();
        }

        // Refresh page and verify persistence
        await page2.reload();
        await helper2.startChat(testUsers.user1.username);
        
        for (const message of messages) {
          await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message })).toBeVisible();
        }

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle long messages and message limits", async ({ browser }) => {
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

        // Test long message
        const longMessage = testMessages.longMessage;
        await helper1.sendMessage(longMessage);
        await helper2.waitForMessage(longMessage);

        // Verify message wrapping and display
        const messageElement = page2.locator(`[data-testid="message-text"]`).filter({ hasText: longMessage });
        await expect(messageElement).toBeVisible();

        // Test message limit (should prevent sending)
        const tooLongMessage = "a".repeat(2001); // Exceeds 2000 character limit
        await page1.fill('[data-testid="message-input"]', tooLongMessage);
        
        // Should show character limit warning
        await expect(page1.locator('[data-testid="character-limit-warning"]')).toBeVisible();
        
        // Send button should be disabled
        await expect(page1.locator('[data-testid="send-button"]')).toBeDisabled();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Typing Indicators", () => {
    test("should show typing indicators in real-time", async ({ browser }) => {
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

        // User 1 starts typing
        await helper1.startTyping();

        // User 2 should see typing indicator
        await expect(page2.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 3000 });
        await expect(page2.locator('[data-testid="typing-indicator"]')).toContainText(`${testUsers.user1.username} is typing`);

        // User 1 stops typing
        await helper1.stopTyping();

        // Typing indicator should disappear
        await expect(page2.locator('[data-testid="typing-indicator"]')).not.toBeVisible({ timeout: 5000 });

        // Test multiple users typing (if applicable)
        await helper2.startTyping();
        await expect(page1.locator('[data-testid="typing-indicator"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle typing timeout", async ({ browser }) => {
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

        // Start typing but don't continue
        await page1.fill('[data-testid="message-input"]', "Starting to type...");
        await expect(page2.locator('[data-testid="typing-indicator"]')).toBeVisible();

        // Wait for typing timeout (usually 3-5 seconds)
        await page1.waitForTimeout(6000);

        // Typing indicator should disappear due to timeout
        await expect(page2.locator('[data-testid="typing-indicator"]')).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Message Status and Read Receipts", () => {
    test("should show message delivery and read status", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        await helper1.startChat(testUsers.user2.username);

        // Send message
        const message = testMessages.greeting;
        await helper1.sendMessage(message);

        // Should show sent status
        await expect(page1.locator('[data-testid="message-status-sent"]')).toBeVisible();

        // User 2 opens chat
        await helper2.startChat(testUsers.user1.username);

        // Should show delivered status
        await expect(page1.locator('[data-testid="message-status-delivered"]')).toBeVisible({ timeout: 5000 });

        // When User 2 views the message, should show read status
        await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message })).toBeVisible();
        
        // Should show read status for sender
        await expect(page1.locator('[data-testid="message-status-read"]')).toBeVisible({ timeout: 5000 });

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should mark conversation as read", async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        await setupFriendship(page1, page2);
        
        // User 1 sends message while User 2 is away
        await helper1.startChat(testUsers.user2.username);
        await helper1.sendMessage(testMessages.greeting);

        // User 2 should see unread indicator
        await page2.goto("/dashboard/chat");
        await expect(page2.locator(`[data-testid="conversation-${testUsers.user1.username}"] [data-testid="unread-badge"]`)).toBeVisible();

        // User 2 opens conversation
        await helper2.startChat(testUsers.user1.username);

        // Unread indicator should disappear
        await expect(page2.locator(`[data-testid="conversation-${testUsers.user1.username}"] [data-testid="unread-badge"]`)).not.toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Socket.IO Connection Management", () => {
    test("should handle connection drops and reconnection", async ({ browser }) => {
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

        // Verify initial connection
        await helper1.sendMessage("Initial message");
        await helper2.waitForMessage("Initial message");

        // Simulate network disconnection
        await context1.setOffline(true);
        
        // Should show offline indicator
        await expect(page1.locator('[data-testid="connection-status-offline"]')).toBeVisible({ timeout: 5000 });

        // Try to send message while offline
        await page1.fill('[data-testid="message-input"]', "Offline message");
        await page1.press('[data-testid="message-input"]', "Enter");

        // Should show pending/failed status
        await expect(page1.locator('[data-testid="message-status-pending"]')).toBeVisible();

        // Reconnect
        await context1.setOffline(false);
        
        // Should show online indicator
        await expect(page1.locator('[data-testid="connection-status-online"]')).toBeVisible({ timeout: 10000 });

        // Pending message should be sent
        await expect(page1.locator('[data-testid="message-status-sent"]')).toBeVisible({ timeout: 5000 });
        await helper2.waitForMessage("Offline message");

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle multiple tab synchronization", async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage(); // Same user, different tab

      const helper1 = new TestHelpers(page1);
      const helper2 = new TestHelpers(page2);

      try {
        // Login same user in both tabs
        await helper1.loginUser(testUsers.user1);
        await helper2.loginUser(testUsers.user1);

        // Open chat in both tabs
        await page1.goto("/dashboard/chat");
        await page2.goto("/dashboard/chat");

        // Send message from tab 1
        await helper1.startChat(testUsers.user2.username);
        await helper1.sendMessage("Message from tab 1");

        // Message should appear in tab 2
        await helper2.startChat(testUsers.user2.username);
        await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: "Message from tab 1" })).toBeVisible();

      } finally {
        await context.close();
      }
    });
  });

  test.describe("Message Search and History", () => {
    test("should search through message history", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      try {
        const helper1 = new TestHelpers(page1);
        await helper1.loginUser(testUsers.user1);
        await helper1.startChat(testUsers.user2.username);

        // Send multiple messages with searchable content
        const messages = [
          "Hello world",
          "How are you today?",
          "Let's meet at the coffee shop",
          "Did you see the news?",
          "Coffee sounds great!"
        ];

        for (const message of messages) {
          await helper1.sendMessage(message);
          await page1.waitForTimeout(300);
        }

        // Search for specific term
        await page1.fill('[data-testid="message-search"]', "coffee");
        
        // Should highlight matching messages
        await expect(page1.locator('[data-testid="message-highlight"]')).toHaveCount(2);
        
        // Clear search
        await page1.fill('[data-testid="message-search"]', "");
        await expect(page1.locator('[data-testid="message-highlight"]')).toHaveCount(0);

      } finally {
        await context1.close();
      }
    });

    test("should load older messages on scroll", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      try {
        const helper1 = new TestHelpers(page1);
        await helper1.loginUser(testUsers.user1);
        await helper1.startChat(testUsers.user2.username);

        // Check initial message count
        const initialCount = await page1.locator('[data-testid="message-text"]').count();

        // Scroll to top to trigger loading older messages
        await page1.locator('[data-testid="chat-messages-container"]').scrollTo({ top: 0 });
        
        // Should show loading indicator
        await expect(page1.locator('[data-testid="loading-older-messages"]')).toBeVisible();

        // Wait for new messages to load
        await page1.waitForTimeout(2000);
        
        const newCount = await page1.locator('[data-testid="message-text"]').count();
        expect(newCount).toBeGreaterThan(initialCount);

      } finally {
        await context1.close();
      }
    });
  });

  test.describe("Message Formatting and Media", () => {
    test("should handle emoji and special characters", async ({ browser }) => {
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

        // Send emoji message
        const emojiMessage = testMessages.emoji;
        await helper1.sendMessage(emojiMessage);
        await helper2.waitForMessage(emojiMessage);

        // Verify emoji display
        const messageElement = page2.locator(`[data-testid="message-text"]`).filter({ hasText: emojiMessage });
        await expect(messageElement).toBeVisible();

        // Send message with special characters
        const specialChars = "Special chars: @#$%^&*()_+-=[]{}|;:,.<>?";
        await helper1.sendMessage(specialChars);
        await helper2.waitForMessage(specialChars);

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should handle code blocks and formatting", async ({ browser }) => {
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

        // Send code message
        const codeMessage = testMessages.code;
        await helper1.sendMessage(codeMessage);
        await helper2.waitForMessage(codeMessage);

        // Should display with code formatting
        await expect(page2.locator('[data-testid="message-code"]')).toBeVisible();

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe("Performance and Scalability", () => {
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

        // Send multiple messages rapidly
        const rapidMessages = Array.from({ length: 10 }, (_, i) => `Rapid message ${i + 1}`);
        
        const startTime = Date.now();
        
        for (const message of rapidMessages) {
          await page1.fill('[data-testid="message-input"]', message);
          await page1.press('[data-testid="message-input"]', "Enter");
          await page1.waitForTimeout(50); // Minimal delay
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should complete within reasonable time
        expect(totalTime).toBeLessThan(5000); // 5 seconds max

        // All messages should be delivered
        for (const message of rapidMessages) {
          await expect(page2.locator(`[data-testid="message-text"]`).filter({ hasText: message })).toBeVisible();
        }

      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test("should maintain performance with large chat history", async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      try {
        const helper1 = new TestHelpers(page1);
        await helper1.loginUser(testUsers.user1);

        // Measure chat loading time with history
        const startTime = Date.now();
        await helper1.startChat(testUsers.user2.username);
        const loadTime = Date.now() - startTime;

        // Should load within acceptable time
        expect(loadTime).toBeLessThan(3000); // 3 seconds max

        // Scroll performance should be smooth
        const scrollStart = Date.now();
        await page1.locator('[data-testid="chat-messages-container"]').scrollTo({ top: 1000 });
        const scrollTime = Date.now() - scrollStart;
        
        expect(scrollTime).toBeLessThan(500); // 500ms max for scroll

      } finally {
        await context1.close();
      }
    });
  });
});