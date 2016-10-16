'use strict'

const React = require('react')

module.exports = (function () {
  // Available ZIndex component properties
  const PROP_TYPES = {
    top: React.PropTypes.bool,
    bottom: React.PropTypes.bool,
    index: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string,
      React.PropTypes.func
    ]),
    above: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string
    ]),
    below: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string
    ])
  }

  // Observed zIndex values, used to discover duplicates
  const indexes = []

  // zIndex name=>index map
  let zmap = null

  // UID
  let id = 0

  function makeZIndex (propName, value, props) {
    if (
      (propName === 'above' || propName === 'below') &&
      (typeof value === 'string' && !zmap[value])
    ) {
      throw new Error(`Unrecognised zIndex name "${value}".`)
    }

    switch (propName) {
      case 'index':
        switch (typeof value) {
          case 'function':
            const index = value(props)
            if (typeof index !== 'number' && typeof index !== 'string') {
              throw new Error(`Derived zIndex must be number or string, got "${typeof index}".`)
            }
            return index

          case 'number':
            return value

          case 'string':
            if (!zmap[value]) {
              throw new Error(`Unrecognised zIndex name "${value}".`)
            }
            return zmap[value]
        }
        break

      case 'above':
        if (typeof value === 'string') return zmap[value] + 1
        else if (typeof value === 'number') return value + 1
        throw new Error(`Expecting string or number for "above", got ${typeof value}.`)

      case 'below':
        if (typeof value === 'string') return zmap[value] - 1
        else if (typeof value === 'number') return value - 1
        throw new Error(`Expecting string or number for "below", got ${typeof value}.`)

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
        throw new Error(`Could not make zIndex, unexpected arguments: prop=${propName} value=${value}.`)
    }
  }

  function generateZMap (array, opts) {
    let customIndexes = 0

    return array.reverse().reduce((zmap, name, i) => {
      if (typeof name !== 'string' && !Array.isArray(name)) {
        throw new Error(`Expecting var to be array or string, got "${typeof name}".`)
      }

      if (Array.isArray(name)) {
        if (typeof name[0] !== 'string') {
          throw new Error(`Expecting var name to be string, got "${typeof name[0]}".`)
        } else if (typeof name[1] !== 'number') {
          throw new Error(`Expecting var index to be number, got "${typeof name[0]}".`)
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

      this.prop = this.getProp(props)
      this._id = id++
      this.zIndex = zmap[this._id] = makeZIndex(this.prop, props[this.prop], props)
    }

    componentWillReceiveProps () {
      this.prop = this.getProp(this.props)
      this.zIndex = zmap[this._id] = makeZIndex(this.prop, this.props[this.prop], this.props)
    }

    getProp (props) {
      const legalProps = Object
        .keys(PROP_TYPES)
        .filter((n) => n !== 'important')

      return legalProps.reduce((ret, prop, i) => {
        if (!ret && typeof props[prop] !== 'undefined') {
          return prop
        } else if ((ret && props[prop]) || (!ret && legalProps.length === i + 1)) {
          throw new Error(`Expecting exactly one prop out of "${legalProps.join('", "')}".`)
        } else {
          return ret
        }
      }, false)
    }

    render () {
      const position = 'relative'
      const zIndex = this.zIndex + (this.props.important ? ' !important' : '')
      const cleanProps = Object.assign({}, this.props)
      const style = Object.assign({}, { position, zIndex }, this.props.style)
      const props = Object.assign({}, cleanProps, { style })

      delete props[this.prop]

      return React.createElement('div', props)
    }
  }

  ZIndex.propTypes = PROP_TYPES

  // ---
  // Decorator
  // ---

  ZIndex.zIndex = function zIndexDecorator (zIndex) {
    const propName = {
      function: 'fn',
      number: 'index',
      string: 'index'
    }[typeof zIndex]

    if (!propName) {
      throw new Error(`Expecting zIndex to be string, number, or function, got "${typeof zIndex}".`)
    }

    const props = {
      [propName]: zIndex
    }

    return (target) => React.createElement(ZIndex, props, [target])
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

  // Clear the zIndex name=>index map
  ZIndex.__clear__ = function clear () {
    zmap = null
  }

  Object.defineProperty(ZIndex, 'vars', {
    enumerable: true,
    get: () => {
      if (!zmap) {
        throw new Error('Initialise ZIndex with ZIndex.setVars() first.')
      }
      return zmap
    }
  })

  return ZIndex
})()
