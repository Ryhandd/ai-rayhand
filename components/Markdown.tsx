'use client';

import { useEffect, useState } from 'react';

interface Props {
  content: string;
  streaming?: boolean;
}

/** Markdown ringan tanpa dependency — cukup untuk heading, list, kode, tabel. */
function miniMarkdown(src: string): string {
  const blocks: string[] = [];

  let s = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // blok kode
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code: string) => {
    blocks.push(code.replace(/\n$/, ''));
    return `\u0000B${blocks.length - 1}\u0000`;
  });

  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  s = s
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>');

  s = s
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  s = s
    .replace(/^\s*[-*•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+[.)]\s+(.+)$/gm, '<li>$1</li>');

  s = s.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  s = s.replace(/<\/ul>\s*<ul>/g, '');

  s = s
    .split(/\n{2,}/)
    .map((p) => {
      const t = p.trim();
      if (!t) return '';
      if (/^<(h\d|ul|ol|table|pre|blockquote)/.test(t)) return t;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  s = s.replace(/\u0000B(\d+)\u0000/g, (_m, i: string) => {
    const code = blocks[Number(i)] ?? '';
    return `<pre><code>${code}</code></pre>`;
  });

  return s;
}

export default function Markdown({ content, streaming }: Props) {
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (copied === null) return;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const html = miniMarkdown(content);

  return (
    <div className="relative">
      <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
      {streaming && (
        <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-blink bg-accent-500 align-baseline" />
      )}
    </div>
  );
}
