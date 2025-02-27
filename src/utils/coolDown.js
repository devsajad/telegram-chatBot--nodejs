const cooldown = (cooldownTime, ctx) => {
  const now = Date.now();
  if (!ctx.session.lastMessageTime) {
    ctx.session.lastMessageTime = 0;
  }
  const timeSinceLastMessage = now - ctx.session.lastMessageTime;
  if (timeSinceLastMessage < cooldownTime) {
    return {
      timerFinished: false,
      time: Math.ceil((cooldownTime - timeSinceLastMessage) / 1000),
    };
  }
  ctx.session.lastMessageTime = now;
  return { timerFinished: true, time: null };
};

export default cooldown;
