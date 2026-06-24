import Resolver from '@forge/resolver';
import { kvs } from '@forge/kvs';

const resolver = new Resolver();

// One record per page, keyed by content ID. Shape:
//   { owner, ownerId, lastReviewedISO, reviewedBy }
//   - owner:          display name of the owner (from the user picker)
//   - ownerId:        Atlassian account ID of the owner (or null)
//   - lastReviewedISO: when it was last marked reviewed (or null)
//   - reviewedBy:     account ID of whoever last marked it reviewed (or null)
const keyFor = (contentId) => `review:${contentId}`;

// App-wide freshness thresholds, stored once under a fixed key and edited from
// the global admin settings page. Defaults apply until an admin saves them.
const SETTINGS_KEY = 'settings:thresholds';
const DEFAULT_SETTINGS = { freshMaxDays: 90, agingMaxDays: 180 };

resolver.define('getSettings', async () => {
  const stored = await kvs.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
});

resolver.define('setSettings', async (req) => {
  const { freshMaxDays, agingMaxDays } = req.payload;
  const record = {
    freshMaxDays: Number(freshMaxDays),
    agingMaxDays: Number(agingMaxDays),
  };
  await kvs.set(SETTINGS_KEY, record);
  return record;
});

resolver.define('getReview', async (req) => {
  const { contentId } = req.payload;
  const record = await kvs.get(keyFor(contentId));
  return record ?? null;
});

// Mark reviewed now. Records WHO did it (reviewedBy) and preserves the owner.
resolver.define('markReviewed', async (req) => {
  const { contentId, reviewedBy } = req.payload;
  const existing = await kvs.get(keyFor(contentId));
  const record = {
    owner: existing?.owner ?? '',
    ownerId: existing?.ownerId ?? null,
    lastReviewedISO: new Date().toISOString(),
    reviewedBy: reviewedBy ?? null,
  };
  await kvs.set(keyFor(contentId), record);
  return record;
});

// Save the owner (name + account ID). Preserves the review fields.
resolver.define('setOwner', async (req) => {
  const { contentId, owner, ownerId } = req.payload;
  const existing = await kvs.get(keyFor(contentId));
  const record = {
    owner: owner ?? '',
    ownerId: ownerId ?? null,
    lastReviewedISO: existing?.lastReviewedISO ?? null,
    reviewedBy: existing?.reviewedBy ?? null,
  };
  await kvs.set(keyFor(contentId), record);
  return record;
});

export const handler = resolver.getDefinitions();
