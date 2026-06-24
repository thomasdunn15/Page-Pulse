import { kvs } from '@forge/kvs';

// This runs on Atlassian's servers to decide what the byline chip says for a
// given page. The platform calls it with (payload, context); the page's content
// ID is on payload.extension.content.id. It returns { title, tooltip } — the
// only dynamic byline properties Confluence supports (plus icon).
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const SETTINGS_KEY = 'settings:thresholds';
const DEFAULT_SETTINGS = { freshMaxDays: 90, agingMaxDays: 180 };

export const handler = async (payload) => {
  const contentId = payload?.extension?.content?.id;
  if (!contentId) return { title: 'Page review' };

  const record = await kvs.get(`review:${contentId}`);
  const settings = { ...DEFAULT_SETTINGS, ...((await kvs.get(SETTINGS_KEY)) ?? {}) };

  const iso = record?.lastReviewedISO;
  if (!iso) {
    return { title: 'Never reviewed', tooltip: 'This page has never been marked reviewed.' };
  }

  const days = Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY);
  let title = 'Stale';
  if (days < settings.freshMaxDays) title = 'Fresh';
  else if (days <= settings.agingMaxDays) title = 'Aging';

  return { title, tooltip: `Last reviewed ${days} day(s) ago — click for details` };
};
