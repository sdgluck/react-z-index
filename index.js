/* global define:false, self:false */
'use strict'

const React = self.React || require('react')
const PropTypes = require('prop-types')

// Additional props
const MODIFIER_PROPS = [
  'important',
  'disabled'
]

// Available ZIndex component properties
const PROP_TYPES = {
  important: PropTypes.bool,
  disabled: PropTypes.bool,
  top: PropTypes.bool,
  bottom: PropTypes.bool,
  index: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.func
  ]),
  above: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]),
  below: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ])
}

// Observed zIndex values, used to discover duplicates
let indexes = []

// zIndex name=>index map
// Initialised when vars are declared by consumer
let zmap = null

// UID
let id = 0

function ZIndexError (msg) {
  return new Error('react-z-index: ' + msg)
}

function makeZIndex (propName, value, props) {
  if (
    (propName === 'above' || propName === 'below') &&
    (typeof value === 'string' && !zmap[value])
  ) {
    throw ZIndexError(`Unrecognised zIndex name "${value}".`)
  }

  switch (propName) {
    case 'index':
      switch (typeof value) {
        case 'function':
          const index = value(props)
          if (typeof index !== 'number' && typeof index !== 'string') {
            throw ZIndexError(`Derived zIndex must be number or string, got "${typeof index}".`)
          }
          return index

        case 'number':
          return value

        case 'string':
          if (!zmap[value]) {
            throw ZIndexError(`Unrecognised zIndex name "${value}".`)
          }
          return zmap[value]
      }
      break

    case 'above':
      if (typeof value === 'string') return zmap[value] + 1
      else if (typeof value === 'number') return value + 1
      throw ZIndexError(`Expecting string or number for "above", got ${typeof value}.`)

    case 'below':
      if (typeof value === 'string') return zmap[value] - 1
      else if (typeof value === 'number') return value - 1
      throw ZIndexError(`Expecting string or number for "below", got ${typeof value}.`)

    case 'top': {
      const keys = Object.keys(zmap)
      let max = keys.length ? -Infinity : 0
      for (let i = 0, len = keys.length; i < len; i++) {
        if (zmap[keys[i]] > max) max = zmap[keys[i]]
      }
      return max + 1
    }

    case 'bottom': {
      const keys = Object.keys(zmap)
      let min = keys.length ? +Infinity : 0
      for (let i = 0, len = keys.length; i < len; i++) {
        if (zmap[keys[i]] < min) min = zmap[keys[i]]
      }
      return min - 1
    }

    default:
      throw ZIndexError(`Could not make zIndex, unexpected arguments: prop=${propName} value=${value}.`)
  }
}

function generateZMap (array, opts) {
  let customIndexes = 0

  return array.reverse().reduce((zmap, name, i) => {
    if (typeof name !== 'string' && !Array.isArray(name)) {
      throw ZIndexError(`Expecting var to be array or string, got "${typeof name}".`)
    }

    if (Array.isArray(name)) {
      if (typeof name[0] !== 'string') {
        throw ZIndexError(`Expecting var name to be string, got "${typeof name[0]}".`)
      } else if (typeof name[1] !== 'number') {
        throw ZIndexError(`Expecting var index to be number, got "${typeof name[0]}".`)
      }

      zmap[name[0]] = name[1]

      customIndexes += 1
    } else {
      zmap[name] = i === 0 ? opts.start : Math.max(
        Math.floor(opts.start + (opts.step * (i - customIndexes))),
        opts.start
      )
    }

    return zmap
  }, {})
}

// ---
// Component
// ---

class ZIndex extends React.Component {
  constructor (props, context) {
    super(props, context)

    zmap = zmap || {}

    this._id = id++
    this.prop = this.getProp(props)
    this.disabled = typeof this.props.disabled === 'boolean' ? this.props.disabled : false
    this.zIndex = zmap[this._id] = makeZIndex(this.prop, props[this.prop], props)
  }

  componentWillReceiveProps () {
    this.prop = this.getProp(this.props)
    this.disabled = typeof this.props.disabled === 'boolean' ? this.props.disabled : false
    this.zIndex = zmap[this._id] = makeZIndex(this.prop, this.props[this.prop], this.props)
  }

  getProp (props) {
    const legalProps = Object
      .keys(PROP_TYPES)
      .filter((n) => MODIFIER_PROPS.indexOf(n) === -1)

    return legalProps.reduce((ret, prop, i) => {
      if (!ret && typeof props[prop] !== 'undefined') {
        return prop
      } else if ((ret && props[prop]) || (!ret && legalProps.length === i + 1)) {
        throw ZIndexError(`Expecting exactly one prop out of "${legalProps.join('", "')}".`)
      } else {
        return ret
      }
    }, false)
  }

  render () {
    const zIndex = this.disabled ? undefined : this.zIndex + (this.props.important ? ' !important' : '')
    const zIndexProps = { style: Object.assign({ zIndex, position: 'relative' }, this.props.style || {}) }
    return React.createElement('div', zIndexProps, this.props.children)
  }
}

ZIndex.propTypes = PROP_TYPES

// ---
// Decorator
// ---

ZIndex.zIndex = function zIndexDecorator (zIndex) {
  if (!['function', 'number', 'string'].indexOf(typeof zIndex) === -1) {
    throw ZIndexError(`Expecting zIndex to be string, number, or function, got "${typeof zIndex}".`)
  }

  return (target) => (props) => React.createElement(
    ZIndex,
    { index: zIndex },
    React.cloneElement(target, props)
  )
}

// ---
// Utility
// ---

ZIndex.setVars = function setVars (vars, opts) {
  opts = Object.assign({}, {
    warnDuplicate: true,
    start: 10,
    step: 10
  }, opts)

  if (zmap) {
    throw ZIndexError('Called ZIndex.setVars() more than once.')
  } else if (typeof vars !== 'object' && !Array.isArray(vars)) {
    throw ZIndexError(`Expecting vars to be object or array, got "${typeof vars}".`)
  } else if (Array.isArray(vars)) {
    if (opts.start && typeof opts.start !== 'number') {
      throw ZIndexError(`Expecting start to be number, got "${typeof opts.start}".`)
    } else if (opts.step && typeof opts.step !== 'number') {
      throw ZIndexError(`Expecting step to be number, got "${typeof opts.start}".`)
    }
  }

  zmap = Array.isArray(vars)
    ? generateZMap(vars, opts)
    : vars

  if (opts.warnDuplicate) {
    Object.keys(zmap).forEach((name) => {
      const index = zmap[name]

      if (indexes.indexOf(index) !== -1) {
        console.warn(`ZIndex: duplicate index ${index} from "${name}".`)
      } else {
        indexes.push(zmap[name])
      }
    })
  }
}

ZIndex.setVar = function setVar (name, value) {
  if (typeof name !== 'string') {
    throw ZIndexError(`Expecting name to be string, got "${typeof name}".`)
  } else if (typeof value !== 'number') {
    throw ZIndexError(`Expecting value to be number, got "${typeof value}".`)
  } else if (ZIndex.vars && ZIndex.vars[name]) {
    throw ZIndexError(`Var with name "${name}" already set.`)
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
  indexes = []
  zmap = null
}

Object.defineProperty(ZIndex, 'vars', {
  enumerable: true,
  get: () => zmap
})

if (typeof define === 'function' && define.amd) {
  define('ZIndex', function () { return ZIndex })
} else if (typeof module === 'object' && module.exports) {
  module.exports = ZIndex
} else {
  self.ZIndex = ZIndex
}
