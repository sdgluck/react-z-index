'use strict'

require('jsdom-global')()

const test = require('tape')
const rewire = require('rewire')
const React = require('react')
const enzyme = require('enzyme')
const Adapter = require('enzyme-adapter-react-16')

const shallow = enzyme.shallow
const mount = enzyme.mount

const ZIndex = rewire('./index')

const c = (props, child) => {
  return React.createElement(ZIndex, props, child)
}

enzyme.configure({ adapter: new Adapter() })

let TOP
let BOTTOM

let consoleWarns = 0

ZIndex.__set__({
  console: {
    log: console.log,
    warn: () => {
      consoleWarns += 1
    }
  }
})

test('initialise values map w/ array', (t) => {
  ZIndex.setVars([
    'Toppest',
    ['Overlay', 15],
    'Modal'
  ])
  t.equal(ZIndex.vars.Modal, 10)
  t.equal(ZIndex.vars.Overlay, 15)
  t.equal(ZIndex.vars.Toppest, 20)
  t.end()
})

test('warns with duplicate indexes', (t) => {
  ZIndex.__clear__()
  ZIndex.setVars({
    Exactly: 1,
    TheSame: 1
  })
  t.equal(consoleWarns, 1)
  t.end()
})

test('disables warns', (t) => {
  ZIndex.__clear__()
  ZIndex.setVars({
    Exactly: 1,
    TheSame: 1
  }, { warnDuplicate: false })
  t.equal(consoleWarns, 1)
  t.end()
})

test('initialise values map w/ object', (t) => {
  ZIndex.__clear__()
  ZIndex.setVars({
    Modal: TOP = 200,
    Overlay: 100
  })
  t.equal(ZIndex.vars.Modal, 200)
  t.equal(ZIndex.vars.Overlay, 100)
  t.end()
})

test('throws if setVars called more than once', (t) => {
  t.throws(() => ZIndex.setVars(), /more than once/i)
  t.end()
})

test('can add value with setVar', (t) => {
  ZIndex.setVar('Backdrop', BOTTOM = 50)
  t.equal(ZIndex.vars.Backdrop, 50)
  t.end()
})

test('setVar throws if var name already exists', (t) => {
  t.throws(() => ZIndex.setVar('Backdrop', 400), /already set/i)
  t.end()
})

test('throws without prop', (t) => {
  t.throws(() => shallow(c({})), /expecting exactly one prop/i)
  t.end()
})

test('throws with more than one prop', (t) => {
  t.throws(() => shallow(c({ top: true, bottom: true })), /expecting exactly one prop/i)
  t.end()
})

test('prop "top"', (t) => {
  const rendered = shallow(c({ top: true }))
  t.equal(rendered.props().style.zIndex, String(TOP + 1))
  t.equal(rendered.props().style.position, 'relative')
  t.end()
})

test('prop "bottom"', (t) => {
  const rendered = shallow(c({ bottom: true }))
  t.equal(rendered.props().style.zIndex, String(BOTTOM - 1))
  t.end()
})

test('prop "index" function', (t) => {
  const rendered = shallow(c({ index: () => 1000 }))
  t.equal(rendered.props().style.zIndex, '1000')
  t.end()
})

test('prop "index" number', (t) => {
  const rendered = shallow(c({ index: 1000 }))
  t.equal(rendered.props().style.zIndex, '1000')
  t.end()
})

test('prop "index" string', (t) => {
  const rendered = shallow(c({ index: ZIndex.vars.Modal }))
  t.equal(rendered.props().style.zIndex, String(TOP))
  t.end()
})

test('prop "above"', (t) => {
  const rendered = shallow(c({ above: ZIndex.vars.Modal }))
  t.equal(rendered.props().style.zIndex, String(ZIndex.vars.Modal + 1))
  t.end()
})

test('prop "below"', (t) => {
  const rendered = shallow(c({ below: ZIndex.vars.Modal }))
  t.equal(rendered.props().style.zIndex, String(ZIndex.vars.Modal - 1))
  t.end()
})

test('additional prop "important"', (t) => {
  const rendered = shallow(c({ important: true, below: ZIndex.vars.Modal }))
  t.equal(rendered.props().style.zIndex, (ZIndex.vars.Modal - 1) + ' !important')
  t.end()
})

test('additional prop "disabled"', (t) => {
  const rendered = shallow(c({ disabled: true, index: 10 }))
  t.equal(rendered.props().style.zIndex, undefined)
  t.end()
})

test('decorator', (t) => {
  const component = React.createElement(
    ZIndex.zIndex(100)(
      React.createElement('span')
    ), { style: { color: 'red' } }
  )
  const rendered = mount(component)
  t.equal(rendered.find(ZIndex).props().index, 100)
  t.equal(rendered.find(ZIndex).childAt(0).childAt(0).props().style.color, 'red')
  t.end()
})
