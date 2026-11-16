import type { ConfigurationDocument } from '../../shared/api/configuration.js';

/**
 * A read model of the live document for operators.
 *
 * The raw JSON stays available for exact editing, but the first question is
 * "what is configured right now?". These are counts and names only; nothing is
 * interpreted as an installed capability or a granted permission.
 */
export interface ConfigurationFact {
  readonly label: string;
  readonly value: string;
}

function references(label: string, entries: readonly { readonly label: string }[]): ConfigurationFact {
  if (entries.length === 0) return { label, value: '无' };
  const names = entries.slice(0, 3).map((entry) => entry.label || '（未命名）').join('、');
  return { label, value: entries.length > 3 ? `${entries.length} 项 · ${names}…` : `${entries.length} 项 · ${names}` };
}

export function formatConfigurationSummary(document: ConfigurationDocument): readonly ConfigurationFact[] {
  const facts: ConfigurationFact[] = [
    references('Skills', document.skills),
    references('Policies', document.policies),
    references('MCP', document.mcpServers),
    references('Plugins', document.plugins),
    { label: 'SecretRefs', value: document.secretRefs.length === 0 ? '无' : `${document.secretRefs.length} 个不透明引用` },
  ];
  if (document.schemaVersion === 2) {
    const composition = document.composition;
    facts.push({
      label: '组合',
      value: `${composition.nodes.length} 个节点 · ${composition.links.length} 条连接`,
    });
  }
  return facts;
}
