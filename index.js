'use strict'

const React = require('react')

const indexes = []

let zmap = null
let id = 0

function unrecognisedVarError (value) {
  return new Error(`Unrecognised string "${value}", set using ZIndex.{setVars,setVar}().`)
}

function makeZIndex (value, modifier, props) {
  if (
    (modifier === 'above' || modifier === 'below') &&
    (typeof value === 'string' && !zmap[value])
  ) {
    throw unrecognisedVarError(value)
  }

  let keys

  switch (modifier) {
    case 'above':
      if (typeof value === 'string') {
        return zmap[value] + 1
      } else if (typeof value === 'number') {
        return value + 1
      }
      throw new Error(`Expecting string or number for "above", got ${typeof value}.`)

    case 'below':
      if (typeof value === 'string') {
        return zmap[value] - 1
      } else if (typeof value === 'number') {
        return value - 1
      }
      throw new Error(`Expecting string or number for "below", got ${typeof value}.`)

    case 'top':
      keys = Object.keys(zmap)
      let max = keys.length ? -Infinity : 0
      for (let i = 0, len = keys.length; i < len; i++) {
        if (zmap[keys[i]] > max) {
          max = zmap[keys[i]]
        }
      }
      return max + 1

    case 'bottom':
      keys = Object.keys(zmap)
      let min = keys.length ? +Infinity : 0
      for (let i = 0, len = keys.length; i < len; i++) {
        if (zmap[keys[i]] < min) {
          min = zmap[keys[i]]
        }
      }
      return min - 1
  }

  switch (typeof value) {
    case 'function':
      const index = value(props)
      if (typeof index !== 'number') {
        throw new Error(`Derived zIndex must be number, got "${typeof index}".`)
      }
      return index

    case 'number':
      return value

    case 'string':
      if (!zmap[value]) {
        throw unrecognisedVarError(value)
      }
      return zmap[value]
  }
}

// ---
// Component
// ---

class ZIndex extends React.Component {
  constructor (props, context) {
    super(props, context)

    const prop = this.getProp(props)

    this._id = id++
    this.zIndex = zmap[this._id] = makeZIndex(props[prop], prop, props)
  }

  componentWillReceiveProps () {
    const prop = this.getProp(this.props)
    this.zIndex = zmap[this._id] = makeZIndex(this.props[prop], prop, this.props)
  }

  getProp (props) {
    const legalProps = Object
      .keys(ZIndex.propTypes)
      .filter((n) => n !== 'important')

    let givenProp = null

    legalProps.forEach((prop, i) => {
      if (!givenProp && typeof props[prop] !== 'undefined') {
        givenProp = prop
      } else if ((givenProp && props[prop]) || (!givenProp && legalProps.length === i + 1)) {
        throw new Error(`Expecting exactly one prop out of "${legalProps.join('", "')}".`)
      }
    })

    return givenProp
  }

  render () {
    const style = this.props.style || {}

    const props = Object.assign({}, this.props, {
      style: Object.assign({}, style, {
        position: style.position || 'relative',
        zIndex: this.zIndex + (this.props.important ? ' !important' : '')
      })
    })

    return React.createElement('div', props)
  }
}

ZIndex.propTypes = {
  index: React.PropTypes.number,
  fn: React.PropTypes.func,
  top: React.PropTypes.bool,
  bottom: React.PropTypes.bool,
  above: React.PropTypes.oneOfType([
    React.PropTypes.number,
    React.PropTypes.string
  ]),
  below: React.PropTypes.oneOfType([
    React.PropTypes.number,
    React.PropTypes.string
  ])
}

ZIndex.setVars = function setVars (vars, opts) {
  opts = Object.assign({}, {
    warnDuplicate: true,
    start: 10,
    step: 10
  }, opts)

  if (zmap) {
    throw new Error('Called ZIndex.setVars() more than once.')
  } else if (typeof vars !== 'object' && !Array.isArray(vars)) {
    throw new Error(`Expecting vars to be object or array, got "${typeof vars}".`)
  } else if (Array.isArray(vars)) {
    if (opts.start && typeof opts.start !== 'number') {
      throw new Error(`Expecting start to be number, got "${typeof opts.start}".`)
    } else if (opts.step && typeof opts.step !== 'number') {
      throw new Error(`Expecting step to be number, got "${typeof opts.start}".`)
    }
  }

  let customIndexes = 0

  if (Array.isArray(vars)) {
    zmap = vars.reverse().reduce((zmap, name, i) => {
      if (typeof name !== 'string' && !Array.isArray(name)) {
        throw new Error(`Expecting var to be array or string, got "${typeof name}".`)
      }

      if (Array.isArray(name)) {
        if (typeof name[0] !== 'string') {
          throw new Error(`Expecting var name to be string, got "${typeof name[0]}".`)
        } else if (typeof name[1] !== 'number') {
          throw new Error(`Expecting var index to be number, got "${typeof name[0]}".`)
        }

        if (opts.warnDuplicate && indexes.indexOf(name[1]) !== -1) {
          console.warn(`ZIndex: duplicate index ${name[1]} from "${name[0]}".`)
        } else if (opts.warnDuplicate) {
          indexes.push(zmap[name[0]])
        }

        zmap[name[0]] = name[1]

        customIndexes += 1
      } else {
        zmap[name] = i === 0 ? opts.start : Math.max(
          Math.floor(opts.start + (opts.step * (i - customIndexes))),
          opts.start
        )

        if (opts.warnDuplicate && indexes.indexOf(zmap[name]) !== -1) {
          console.warn(`ZIndex: duplicate index ${name[1]} from "${name}".`)
        } else if (opts.warnDuplicate) {
          indexes.push(zmap[name])
        }
      }

      return zmap
    }, {})
  } else {
    zmap = vars

    if (opts.warnDuplicate) {
      Object.keys(vars).forEach((name) => {
        const index = vars[name]

        if (indexes.indexOf(index) !== -1) {
          console.warn(`ZIndex: duplicate index ${index} from "${name}".`)
        } else {
          indexes.push(zmap[name])
        }
      })
    }
  }
}

ZIndex.setVar = function setVar (name, value) {
  if (typeof name !== 'string') {
    throw new Error(`Expecting name to be string, got "${typeof name}".`)
  } else if (typeof value !== 'number') {
    throw new Error(`Expecting value to be number, got "${typeof value}".`)
  } else if (ZIndex.vars && ZIndex.vars[name]) {
    throw new Error(`Var with name "${name}" already set.`)
  }

  if (indexes.indexOf(value) !== -1) {
    console.warn(`ZIndex: duplicate index ${value} from "${name}".`)
  } else {
    indexes.push(value)
  }

  zmap = zmap || {}

  zmap[name] = value

  return value
}

ZIndex.__clear__ = function clear () {
  zmap = null
}

Object.defineProperty(ZIndex, 'vars', {
  enumerable: true,
  get: () => {
    if (!zmap) {
      throw new Error('Initialise ZIndex with ZIndex.setVars().')
    }
    return zmap
  }
})

module.exports = ZIndex

// ---
// Decorator
// ---

module.exports.zIndex = (zIndex) => {
  const propName = {
    function: 'fn',
    number: 'index',
    string: ''
  }[typeof zIndex]

  if (!propName) {
    throw new Error(`Expecting zIndex to be string, number, or function, got "${typeof zIndex}".`)
  }

  const props = {
    [propName]: zIndex
  }

  return (target) => React.createElement(ZIndex, props, [target])
}
