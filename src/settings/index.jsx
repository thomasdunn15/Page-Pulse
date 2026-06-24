import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  Stack,
  Box,
  Heading,
  Label,
  Textfield,
  SectionMessage,
} from '@forge/react';
import { invoke } from '@forge/bridge';

// Global settings page (Confluence admin). Edits the freshness day-thresholds
// that every Page Pulse macro reads. Stored app-wide via the same resolver.
const Settings = () => {
  const [fresh, setFresh] = useState('');
  const [aging, setAging] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('getSettings').then((s) => {
      setFresh(String(s.freshMaxDays));
      setAging(String(s.agingMaxDays));
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const f = Number(fresh);
    const a = Number(aging);
    if (!Number.isFinite(f) || !Number.isFinite(a) || f <= 0 || a <= 0) {
      setError('Both values must be positive numbers.');
      return;
    }
    if (a < f) {
      setError('“Aging” days must be greater than or equal to “Fresh” days.');
      return;
    }
    setError(null);
    setIsSaving(true);
    await invoke('setSettings', { freshMaxDays: f, agingMaxDays: a });
    setIsSaving(false);
    setFlash('Settings saved ✓');
    setTimeout(() => setFlash(null), 2500);
  };

  if (!loaded) return <Text>Loading settings…</Text>;

  return (
    <Box padding="space.300">
      <Stack space="space.200">
        <Heading size="medium">Page Pulse — freshness settings</Heading>
        <Text>These thresholds apply to every page across your site.</Text>

        {flash && <SectionMessage appearance="success"><Text>{flash}</Text></SectionMessage>}
        {error && <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>}

        <Stack space="space.050">
          <Label labelFor="fresh-input">“Fresh” up to (days)</Label>
          <Textfield
            id="fresh-input"
            type="number"
            value={fresh}
            onChange={(e) => setFresh(e.target.value)}
            isDisabled={isSaving}
          />
        </Stack>

        <Stack space="space.050">
          <Label labelFor="aging-input">“Aging” up to (days) — beyond this is “Stale”</Label>
          <Textfield
            id="aging-input"
            type="number"
            value={aging}
            onChange={(e) => setAging(e.target.value)}
            isDisabled={isSaving}
          />
        </Stack>

        <Button appearance="primary" onClick={handleSave} isDisabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save settings'}
        </Button>
      </Stack>
    </Box>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>
);
