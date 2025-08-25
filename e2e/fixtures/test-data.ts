// Test data fixtures for E2E tests
export const testUsers = {
  user1: {
    email: "test.user1@friendfinder.com",
    password: "TestPassword123!",
    username: "testuser1",
    firstName: "Test",
    lastName: "User One",
    bio: "Test user for E2E testing",
  },
  user2: {
    email: "test.user2@friendfinder.com", 
    password: "TestPassword123!",
    username: "testuser2",
    firstName: "Test",
    lastName: "User Two",
    bio: "Second test user for E2E testing",
  },
  admin: {
    email: "admin@friendfinder.com",
    password: "AdminPassword123!",
    username: "admin",
    firstName: "Admin",
    lastName: "User",
    bio: "Administrator account for testing",
  },
};

export const testLocations = {
  newyork: { 
    lat: 40.7128, 
    lng: -74.006,
    address: "New York, NY, USA" 
  },
  london: { 
    lat: 51.5074, 
    lng: -0.1278,
    address: "London, UK" 
  },
  tokyo: {
    lat: 35.6762,
    lng: 139.6503,
    address: "Tokyo, Japan"
  },
  sydney: {
    lat: -33.8688,
    lng: 151.2093,
    address: "Sydney, Australia"
  },
};

export const testNetworks = {
  office_wifi: {
    ssid: "FriendFinder_Office",
    bssid: "00:11:22:33:44:55",
    signalStrength: -45,
  },
  home_wifi: {
    ssid: "Home_Network_5G",
    bssid: "AA:BB:CC:DD:EE:FF",
    signalStrength: -35,
  },
  cafe_wifi: {
    ssid: "CafeWiFi_Guest",
    bssid: "12:34:56:78:90:AB",
    signalStrength: -60,
  },
};

export const testMessages = {
  greeting: "Hello! How are you doing today?",
  followup: "Are you free to chat for a bit?",
  longMessage: "This is a much longer message to test how the chat interface handles messages that span multiple lines and contain more content than a typical short message. It should wrap properly and display correctly in the UI.",
  emoji: "Hey! 👋 How's it going? 😊",
  code: "Check out this code: `console.log('Hello World');`",
};

export const testFiles = {
  profileImage: {
    name: "profile.jpg",
    type: "image/jpeg",
    size: 1024 * 512, // 512KB
  },
  largeImage: {
    name: "large-photo.png", 
    type: "image/png",
    size: 1024 * 1024 * 5, // 5MB
  },
  invalidFile: {
    name: "document.pdf",
    type: "application/pdf",
    size: 1024 * 100, // 100KB
  },
};

// Test environment configurations
export const testConfig = {
  discovery: {
    defaultRadius: 5000, // 5km
    maxRadius: 50000, // 50km
    minRadius: 100, // 100m
  },
  messaging: {
    maxMessageLength: 2000,
    typingTimeout: 3000, // 3 seconds
  },
  calls: {
    connectionTimeout: 30000, // 30 seconds
    ringingTimeout: 60000, // 60 seconds
  },
  uploads: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
};

// Helper functions for test data generation
export function generateRandomUser(suffix = Math.random().toString(36).substring(7)) {
  return {
    email: `testuser${suffix}@friendfinder.com`,
    password: "TestPassword123!",
    username: `testuser${suffix}`,
    firstName: "Random",
    lastName: `User${suffix}`,
    bio: `Auto-generated test user ${suffix}`,
  };
}

export function generateRandomLocation() {
  // Generate coordinates within reasonable bounds
  const lat = (Math.random() - 0.5) * 180; // -90 to 90
  const lng = (Math.random() - 0.5) * 360; // -180 to 180
  
  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    address: `Test Location ${Math.random().toString(36).substring(7)}`,
  };
}

export function generateRandomMessage(length = 50) {
  const words = [
    "hello", "world", "test", "message", "friend", "chat", "discover",
    "location", "nearby", "profile", "update", "notification", "call",
    "video", "audio", "settings", "privacy", "security", "mobile",
  ];
  
  const messageWords = [];
  const targetWords = Math.max(1, Math.floor(length / 6)); // Approximate words
  
  for (let i = 0; i < targetWords; i++) {
    messageWords.push(words[Math.floor(Math.random() * words.length)]);
  }
  
  return messageWords.join(" ");
}

// Test data cleanup helpers
export function cleanupTestData() {
  // This would be implemented to clean up test data from database
  // For now, returns a promise that resolves
  return Promise.resolve();
}

export default {
  testUsers,
  testLocations,
  testNetworks,
  testMessages,
  testFiles,
  testConfig,
  generateRandomUser,
  generateRandomLocation,
  generateRandomMessage,
  cleanupTestData,
};