import { useCallback, useState } from 'react';
import { updateAgent, type Agent } from '../../shared/api/agents.js';

export function useAgentToolSave(onSaved: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (
    selected: Agent,
    profile: { name: string; providerId: string; modelId: string; instructions: string;
      grantedCapabilities: { kind: 'tool' | 'skill'; name: string }[] },
  ) => {
    setSaving(true);
    setError(null);
    try {
      await updateAgent(selected.id, selected.currentRevisionId, profile);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }, [onSaved]);

  return { saving, error, save };
}
