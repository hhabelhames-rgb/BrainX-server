const { v4: uuidv4 } = require('uuid');

/**
 * Generate a Jitsi Meet link for a session
 * Jitsi Meet is free, open-source, and requires no API key.
 * Room names are based on a UUID to prevent guessing.
 */
const generateMeetingLink = (sessionId) => {
  const roomId = `brainx-${sessionId}-${uuidv4().split('-')[0]}`;
  // Using meet.jit.si public server
  return `https://meet.jit.si/${roomId}`;
};

module.exports = { generateMeetingLink };
