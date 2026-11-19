const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const html = readFileSync(require('node:path').join(__dirname, '../editor/index.template.html'), 'utf8')
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\bboot\(\)\s*$/, '')

function editor() {
  const elements = new Map()
  function element() {
    return { value: '', hidden: false, clientWidth: 800, clientHeight: 600,
      attributes: {}, handlers: {}, style: { setProperty() {} },
      setAttribute(k, v) { this.attributes[k] = v },
      addEventListener(k, fn) { this.handlers[k] = fn },
      appendChild(child) { this.child = child },
      querySelector() { return this.child || null },
      classList: { add() {}, remove() {} } }
  }
  const svg = element()
  svg.viewBox = { baseVal: { width: 2000, height: 1000 } }
  const calls = [], edits = []
  const context = vm.createContext({
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id) },
      createElement() { return { ...element(), firstElementChild: svg } },
      head: { appendChild() {} }
    },
    window: { mermaid: { initialize() {}, async render(id, source) { calls.push(source); return { svg: '<svg/>' } } },
      orca: { document: { async applyEdit(e) { edits.push(e) } } } },
    ResizeObserver: class { observe() {} },
    setTimeout() { return 1 }, clearTimeout() {},
    getComputedStyle() { return { flexDirection: 'row' } }
  })
  vm.runInContext(script, context)
  return { context, elements, calls, edits, svg, run: code => vm.runInContext(code, context) }
}

test('layout override respects source content and never enters the document edit', async () => {
  const e = editor()
  const source = '---\nconfig:\n  layout: elk\n---\nflowchart LR\n A --> B'
  e.elements.get('code').value = source
  e.elements.get('layout').value = 'dagre'
  e.run('doc = { version: 7, readOnly: false }')
  await e.run('render()')
  assert.match(e.calls[0], /"layout":"dagre"/)
  assert.ok(e.calls[0].startsWith(source))
  assert.equal(e.elements.get('code').value, source)
  assert.equal(e.edits.length, 0)
  await e.run('sendEdit()')
  assert.equal(e.edits[0].content.text, source)
  assert.equal(e.edits[0].baseVersion, 7)
})

test('Source preserves directives and non-flowchart diagrams disable layout override', async () => {
  const e = editor()
  const source = '%%{init: {"layout":"elk"}}%%\nflowchart TB\n A --> B'
  e.elements.get('code').value = source
  e.elements.get('layout').value = 'source'
  await e.run('render()')
  assert.equal(e.calls.at(-1), source)
  e.elements.get('layout').value = 'elk'
  e.elements.get('code').value = 'sequenceDiagram\n A->>B: Hello'
  await e.run('render()')
  assert.equal(e.calls.at(-1), e.elements.get('code').value)
  assert.equal(e.elements.get('layout').disabled, true)
})

test('Adaptive routes short and large flowcharts to different engines', async () => {
  const e = editor()
  e.elements.get('layout').value = 'adaptive'
  e.elements.get('code').value = 'flowchart TD\n A --> B'
  await e.run('render()')
  assert.match(e.calls.at(-1), /"layout":"dagre"/)
  e.elements.get('code').value += '\n%% comment'.repeat(30)
  await e.run('render()')
  assert.match(e.calls.at(-1), /"layout":"elk"/)
})

test('fit contains the full diagram; manual zoom disables auto-fit and Fit restores it', async () => {
  const e = editor()
  e.elements.get('code').value = 'flowchart TD\n A --> B'
  e.elements.get('layout').value = 'source'
  await e.run('render()')
  assert.equal(e.run('zoom'), 0.39)
  assert.ok(e.run('panX >= 0 && panY >= 0'))
  e.elements.get('chart').handlers.wheel({ preventDefault() {}, deltaY: -1 })
  assert.equal(e.run('autoFit'), false)
  const manualZoom = e.run('zoom')
  e.elements.get('chart').clientWidth = 400
  assert.equal(e.run('zoom'), manualZoom)
  e.elements.get('fit').handlers.click()
  assert.equal(e.run('autoFit'), true)
  assert.equal(e.run('zoom'), 0.19)
  e.svg.viewBox.baseVal.height = 100000
  e.run('fitView()')
  assert.ok(e.run('zoom') < 0.01, 'large diagrams can fit below 1%')
})

test('failed rendering retains the previous diagram and exposes a recoverable error', async () => {
  const e = editor()
  e.elements.get('code').value = 'flowchart TD\n A --> B'
  e.elements.get('layout').value = 'elk'
  await e.run('render()')
  e.context.window.mermaid.render = async () => { throw Error('Invalid edge') }
  await e.run('render()')
  assert.equal(e.elements.get('chart').child, e.svg)
  assert.match(e.elements.get('error').textContent, /Invalid edge/)
  assert.equal(e.elements.get('render-status').hidden, true)
  assert.equal(e.elements.get('chartwrap').attributes['aria-busy'], 'false')
})

test('typing invalidates an in-flight result before it can replace the chart', async () => {
  const e = editor()
  e.elements.get('code').value = 'flowchart TD\n A --> B'
  e.elements.get('layout').value = 'source'
  let finish
  e.context.window.mermaid.render = () => new Promise(resolve => { finish = resolve })
  const pending = e.run('render()')
  e.run('scheduleRender(250)')
  finish({ svg: '<svg/>' })
  await pending
  assert.equal(e.elements.get('chart').child, undefined)
})
