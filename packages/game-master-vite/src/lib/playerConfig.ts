// Browser-compatible player configuration
// Uses environment variables or defaults

export function getPlayerUrls(): string[] {
  // In production, these could come from environment variables
  // For now, we'll use the default localhost URLs
  const defaultPlayers = [
    'http://10.43.1.247:4001',
    'http://10.43.1.247:4002',
    'http://10.43.1.247:4003',
    'http://10.43.1.247:4004',
    'http://10.43.1.247:4005',
    'http://10.43.1.247:4006'
  ];

  // Check if there's a custom configuration in environment variables
  // This would need to be set at build time for Vite
  const customPlayers = import.meta.env.VITE_PLAYER_URLS;
  
  if (customPlayers) {
    try {
      return JSON.parse(customPlayers);
    } catch (e) {
      console.warn('Failed to parse VITE_PLAYER_URLS, using defaults');
    }
  }

  return defaultPlayers;
}