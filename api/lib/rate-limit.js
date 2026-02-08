const buckets = new Map();

const now = () => Date.now();

export const consumeRateLimit = ({ key, limit, windowMs }) => {
  const bucketKey = String(key || 'anonymous');
  const currentTime = now();
  const current = buckets.get(bucketKey);

  if (!current || current.expiresAt <= currentTime) {
    buckets.set(bucketKey, {
      count: 1,
      expiresAt: currentTime + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.expiresAt - currentTime };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { allowed: true, remaining: limit - current.count };
};
