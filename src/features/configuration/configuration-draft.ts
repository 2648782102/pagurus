import { isRecord } from '../../shared/api/guards.js';

export type DraftResolution =
  | { readonly ok: true; readonly document: unknown }
  | { readonly ok: false; readonly message: string; readonly issue: { path: string; reason: string } };

/**
 * Turns the editor text into a document the Runtime can judge.
 *
 * The checks are ordered as the user experiences them: an empty draft, then
 * malformed JSON, then a schema the connected Runtime cannot execute. Apply and
 * validate both need exactly this, so neither owns a second copy.
 */
export function resolveDraft(draft: string, supportsComposition: boolean): DraftResolution {
  if (!draft.trim()) {
    return { ok: false, message: '请输入完整的配置文档。', issue: { path: '$', reason: '文档不能为空' } };
  }

  let document: unknown;
  try {
    document = JSON.parse(draft) as unknown;
  } catch {
    return { ok: false, message: '配置文档不是有效的 JSON。', issue: { path: '$', reason: '必须是有效的 JSON' } };
  }

  if (isRecord(document) && document.schemaVersion === 2 && !supportsComposition) {
    return {
      ok: false,
      message: '当前 Conchbase 未提供 composition-execution 能力，无法应用 schemaVersion 2。',
      issue: { path: 'schemaVersion', reason: '需要 Conchbase 0.5.0 或更新版本' },
    };
  }

  return { ok: true, document };
}
