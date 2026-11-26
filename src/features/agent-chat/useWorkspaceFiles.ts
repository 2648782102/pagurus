import { useEffect, useState } from 'react';
import { listWorkspaceFiles, type WorkspaceFileEntry } from '../../shared/api/workspace.js';

export interface WorkspaceFilesState {
  readonly files: readonly WorkspaceFileEntry[];
  readonly loading: boolean;
}

/**
 * Loads the `@` picker's candidates while the trigger is open.
 *
 * The query goes to the Runtime rather than filtering a cached page: the index
 * is capped, so filtering 40 of 4000 files locally would answer "no match" for
 * a file that exists. Debounced only after a real query — an empty trigger
 * should show something immediately, since that is the moment the reader is
 * deciding whether the picker is worth using.
 */
export function useWorkspaceFiles(
  query: string | null,
  enabled: boolean,
): WorkspaceFilesState {
  const [state, setState] = useState<WorkspaceFilesState>({ files: [], loading: false });

  useEffect(() => {
    if (!enabled || query === null) {
      setState({ files: [], loading: false });
      return;
    }
    let active = true;
    const controller = new AbortController();
    setState((previous) => ({ files: previous.files, loading: true }));
    const timer = window.setTimeout(() => {
      listWorkspaceFiles(query, controller.signal)
        .then((index) => {
          if (active) setState({ files: index.files, loading: false });
        })
        .catch(() => {
          if (active) setState({ files: [], loading: false });
        });
    }, query.length === 0 ? 0 : 120);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled, query]);

  return state;
}
