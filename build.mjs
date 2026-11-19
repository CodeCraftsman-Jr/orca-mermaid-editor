import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('./', import.meta.url)
execFileSync(process.execPath, ['build-trimmed.mjs'], {
  cwd: fileURLToPath(new URL('build-trim/', root)),
  stdio: 'inherit', timeout: 120_000
})
const lib = readFileSync(new URL('build-trim/mermaid-trim.min.js', root), 'utf8')
  .replace(/<\/script/gi, '<\\/script').replaceAll('<!--', '<\\!--')
const template = readFileSync(new URL('editor/index.template.html', root), 'utf8')
const marker = '<script src="mermaid.min.js"></script>'
if (!template.includes(marker)) throw new Error('Template bundle marker missing')
const output = template.replace(marker, () => '<script>/*! Mermaid 11.4.1 + offline ELK layout */\n' + lib + '\n</script>')
writeFileSync(new URL('editor/index.html', root), output)
process.stdout.write('Built editor/index.html: ' + Buffer.byteLength(output) + ' bytes\n')
