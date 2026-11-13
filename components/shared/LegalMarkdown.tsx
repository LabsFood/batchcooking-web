import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/* ─────────────────────────────────────────────────────────────────────────────
   Les documents légaux V1, recopiés du Drive en Markdown (`content/legal`), et
   rendus ici côté serveur. Un rendu volontairement minimal : titres `#`/`##`,
   tableaux `| a | b |`, paragraphes. Pas de dépendance pour si peu.

   ponytail: pas de gras, de listes ni de liens Markdown ; ajouter `remark` si un
   document en a besoin.
   ───────────────────────────────────────────────────────────────────────────── */

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export default function LegalMarkdown({ file }: { file: string }) {
  const text = readFileSync(join(process.cwd(), 'content', 'legal', file), 'utf8')
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let table: string[][] = []

  const flushTable = () => {
    if (!table.length) return
    const [head, ...rows] = table
    out.push(
      <div key={`t${out.length}`} className="not-prose my-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {head.map((c, i) => (
                <th key={i} className="border-b border-border p-2 font-semibold text-navy">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border-b border-border p-2 align-top text-ink-mid">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
    table = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim())
      if (!cells.every((c) => /^:?-+:?$/.test(c))) table.push(cells)
      continue
    }
    flushTable()
    if (!line) continue
    const h = /^(#{1,2})\s+(.*)$/.exec(line)
    if (h) {
      out.push(
        <h2 key={out.length} id={slug(h[2])}>
          {h[2]}
        </h2>,
      )
    } else {
      out.push(<p key={out.length}>{line}</p>)
    }
  }
  flushTable()
  return <>{out}</>
}
