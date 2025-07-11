// Generate a consistent emoji avatar based on user's name
export const generateEmojiAvatar = (name: string): string => {
  const avatars = [
    '👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🎓', '👩‍🎓', '🧑‍🎓',
    '👨‍🔬', '👩‍🔬', '🧑‍🔬', '👨‍🎨', '👩‍🎨', '🧑‍🎨',
    '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🏫', '👩‍🏫', '🧑‍🏫',
    '🧑‍🌾', '👩‍🌾', '👨‍🌾', '🧑‍🍳', '👩‍🍳', '👨‍🍳',
    '🧑‍⚕️', '👩‍⚕️', '👨‍⚕️', '🧑‍🎤', '👩‍🎤', '👨‍🎤'
  ];

  // Generate a hash from the name to get consistent avatar
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return avatars[Math.abs(hash) % avatars.length];
};

// Clean avatar URL - replace googleusercontent with emoji
export const getCleanAvatar = (user: { photoURL?: string | null; displayName?: string | null; avatar?: string }): string => {
  // If user has a custom avatar (emoji), use that
  if (user.avatar && !user.avatar.includes('googleusercontent')) {
    return user.avatar;
  }
  
  // If photoURL is from Google (contains googleusercontent), don't use it
  if (user.photoURL && !user.photoURL.includes('googleusercontent')) {
    return user.photoURL;
  }
  
  // Generate consistent emoji avatar based on name
  const name = user.displayName || 'User';
  return generateEmojiAvatar(name);
}; 