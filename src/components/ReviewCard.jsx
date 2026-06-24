import React, { useEffect, useState } from "react";
import {
  Text,
  Button,
  Lozenge,
  Stack,
  Inline,
  Box,
  Icon,
  Heading,
  User,
  UserPicker,
  ProgressBar,
  SectionMessage,
  useProductContext,
  xcss,
} from "@forge/react";
import { invoke } from "@forge/bridge";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Fallback thresholds, used until the admin's saved settings load.
const DEFAULT_THRESHOLDS = { freshMaxDays: 90, agingMaxDays: 180 };

// Everything below is DERIVED from the stored date + the configured thresholds.
const getFreshness = (lastReviewedISO, thresholds) => {
  const { freshMaxDays, agingMaxDays } = thresholds;
  if (!lastReviewedISO) {
    return {
      label: "Never reviewed",
      appearance: "default",
      daysSince: null,
      progress: 0,
    };
  }
  const daysSince = Math.floor(
    (Date.now() - new Date(lastReviewedISO).getTime()) / MS_PER_DAY,
  );

  let label = "Stale";
  let appearance = "removed"; // red
  if (daysSince < freshMaxDays) {
    label = "Fresh";
    appearance = "success"; // green
  } else if (daysSince <= agingMaxDays) {
    label = "Aging";
    appearance = "moved"; // yellow
  }
  const progress = Math.min(daysSince / agingMaxDays, 1);
  return { label, appearance, daysSince, progress };
};

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const daysAgoText = (days) =>
  days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;

const nextDueDate = (lastReviewedISO, freshMaxDays) =>
  new Date(new Date(lastReviewedISO).getTime() + freshMaxDays * MS_PER_DAY);

const formatDate = (d) =>
  d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Fixed-width label column so every value starts at the same x.
const labelColumn = xcss({ minWidth: "140px" });

const InfoRow = ({ glyph, label, value }) => {
  const isText = typeof value === "string";
  return (
    // Everything center-aligned (keeps the icon level). Label and value are
    // BOTH wrapped in a Box so their line-boxes are identical and center the
    // same way — avoiding the 1-2px offset that bare-Text-vs-Box caused.
    <Inline space="space.100" alignBlock="center">
      <Icon glyph={glyph} label={label} />
      <Box xcss={labelColumn}>
        <Text weight="bold">{label}</Text>
      </Box>
      {isText ? (
        <Box>
          <Text>{value}</Text>
        </Box>
      ) : (
        value
      )}
    </Inline>
  );
};

// The full review card. Shared by BOTH the macro and the byline popup —
// it reads the page from useProductContext, which works in either surface.
const ReviewCard = () => {
  const context = useProductContext();
  const [record, setRecord] = useState(undefined);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [pickedOwner, setPickedOwner] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [flash, setFlash] = useState(null);

  const contentId = context?.extension?.content?.id;
  const pageVersion = context?.extension?.content?.version;
  const currentUserId = context?.accountId;

  useEffect(() => {
    if (!contentId) return;
    invoke("getReview", { contentId }).then((stored) => {
      setRecord(stored);
      setPickedOwner(
        stored?.ownerId ? { id: stored.ownerId, name: stored.owner } : null,
      );
    });
    invoke("getSettings").then(setThresholds);
  }, [contentId]);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  };

  const handleMarkReviewed = async () => {
    setIsReviewing(true);
    const updated = await invoke("markReviewed", {
      contentId,
      reviewedBy: currentUserId,
    });
    setRecord(updated);
    setIsReviewing(false);
    showFlash("Marked reviewed ✓");
  };

  const handleSaveOwner = async () => {
    setIsSavingOwner(true);
    const updated = await invoke("setOwner", {
      contentId,
      owner: pickedOwner?.name ?? "",
      ownerId: pickedOwner?.id ?? null,
    });
    setRecord(updated);
    setIsSavingOwner(false);
    showFlash("Owner saved ✓");
  };

  if (!context) return <Text>Loading…</Text>;
  if (record === undefined) return <Text>Loading review info…</Text>;

  const lastReviewedISO = record?.lastReviewedISO;
  const freshness = getFreshness(lastReviewedISO, thresholds);

  const ownerValue = record?.ownerId ? (
    <User accountId={record.ownerId} />
  ) : (
    record?.owner || "nobody assigned yet"
  );

  return (
    <Box backgroundColor="elevation.surface.sunken" padding="space.300">
      <Stack space="space.200">
        <Inline spread="space-between" alignBlock="center">
          <Heading size="medium">Page review</Heading>
          <Lozenge appearance={freshness.appearance} isBold>
            {freshness.label}
          </Lozenge>
        </Inline>

        {flash && (
          <SectionMessage appearance="success">
            <Text>{flash}</Text>
          </SectionMessage>
        )}

        {freshness.label === "Aging" && (
          <SectionMessage appearance="warning" title="Review due soon">
            <Text>
              This page hasn't been reviewed in a while. Give it a look and mark
              it reviewed.
            </Text>
          </SectionMessage>
        )}
        {freshness.label === "Stale" && (
          <SectionMessage appearance="error" title="Review overdue">
            <Text>
              This page is stale. Please review its contents and mark it
              reviewed.
            </Text>
          </SectionMessage>
        )}

        <Stack space="space.100">
          <InfoRow glyph="person" label="Owner:" value={ownerValue} />
          <InfoRow
            glyph="calendar"
            label="Last reviewed:"
            value={
              lastReviewedISO
                ? `${formatDateTime(lastReviewedISO)} (${daysAgoText(freshness.daysSince)})`
                : "never"
            }
          />
          {record?.reviewedBy && (
            <InfoRow
              glyph="check-circle"
              label="Reviewed by:"
              value={<User accountId={record.reviewedBy} />}
            />
          )}
          {lastReviewedISO && (
            <InfoRow
              glyph="refresh"
              label="Next review due:"
              value={formatDate(
                nextDueDate(lastReviewedISO, thresholds.freshMaxDays),
              )}
            />
          )}
          {pageVersion != null && (
            <InfoRow
              glyph="edit"
              label="Page version:"
              value={String(pageVersion)}
            />
          )}
        </Stack>

        {lastReviewedISO && (
          <Stack space="space.050">
            <Text size="small" color="color.text.subtle">
              Freshness ({freshness.daysSince} of {thresholds.agingMaxDays}{" "}
              days)
            </Text>
            <ProgressBar value={freshness.progress} />
          </Stack>
        )}

        <UserPicker
          label="Set owner"
          name="owner"
          defaultValue={record?.ownerId ?? undefined}
          placeholder="Search for a user…"
          onChange={(u) =>
            setPickedOwner(u ? { id: u.id, name: u.name } : null)
          }
        />
        <Inline space="space.100">
          <Button
            onClick={handleSaveOwner}
            isDisabled={isSavingOwner || !contentId}
          >
            {isSavingOwner ? "Saving…" : "Save owner"}
          </Button>
          <Button
            appearance="primary"
            onClick={handleMarkReviewed}
            isDisabled={isReviewing || !contentId}
          >
            {isReviewing ? "Saving…" : "Mark reviewed"}
          </Button>
        </Inline>
      </Stack>
    </Box>
  );
};

export default ReviewCard;
