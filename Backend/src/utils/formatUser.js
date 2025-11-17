// src/utils/formatUser.js
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || 'user',
  gmail_connected: user.gmail_connected || false
});

export default formatUser;
