# react-z-index

> :globe_with_meridians: Easily manage global component z-index

Made with ❤ at <a href="http://www.twitter.com/outlandish">@outlandish</a>

<a href="http://badge.fury.io/js/react-z-index"><img alt="npm version" src="https://badge.fury.io/js/react-z-index.svg" /></a>
<a href="http://standardjs.com/"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg" /></a>

Takes the pain out of managing component zIndex across your application! :heart_eyes:

## Features

- Manage zIndex values in one place
- Dynamically set the zIndex of components
- Optionally warns you if a zIndex value is used more than once
- Component or decorator interface
- Add new zIndex values with ease
- Create zIndex values...
    - automatically; generate unique and ordered zIndex values, or
    - manually; define your own zIndex values entirely, or
    - both!
    
## Install

```sh
npm i --save react-z-index
```

```sh
yarn add react-z-index
```

## Import

The library uses ES2015 features so should be used in conjunction with Babel and a bundler for use within the browser environment, e.g. Browserify or Webpack.

```js
// ES2015
import ZIndex, { zIndex } from 'react-z-index'
```

```js
// CommonJS
var ZIndex = require('react-z-index')
var zIndex = ZIndex.zIndex
```

## API

### `ZIndex.setVars(vars[, opts])`

Optionally initialise `react-z-index` with a map of names to zIndex values.

- __vars__ {Object|Array} Map of names to zIndex values or array of names
- [__opts.start__] {Number} _(optional)_ Start zIndex for generated values (default: `10`)
- [__opts.step__] {Number} _(optional)_ Generated index step (default: `10`)
- [__opts.warnDuplicate__] {Boolean} _(optional)_ Warn if zIndex value used more than once (default: `true`)

Vars are made available at `ZIndex.vars`, e.g. `ZIndex.vars.Modal`.

```js
// Explicit zIndex values
ZIndex.setVars({
  Modal: 300,
  Overlay: 200,
  Dropdown: 100
})

// Generated zIndex values
// First element is highest, last element is lowest
// Define explicit indexes using array
ZIndex.setVars([
  'Modal', //=> 30
  'Overlay', //=> 20
  ['Dropdown', 15], //=> 15
  'Backdrop' //=> 10
])

// e.g. suppress duplicate zIndex warning
ZIndex.setVars([
  ['ErrorModal', 100],
  ['WarningModal', 100]
], {
  warnDuplicate: false
})
```

### `ZIndex.setVar(name, value)`

Set a new zIndex value.

- __name__ {String} Name of the value
- __value__ {Number} zIndex integer

Vars should be treated as constants, so this cannot be used to update the value of a predefined var.

```js
ZIndex.setVar('Modal', 400)
```

## Component

Each component should use exactly one of the following props:

- __index__ {String|Number|Function} Set zIndex explicitly, by reference to predefined value, or derive from props
- __above__ {String|Number} Set the zIndex to be above the value
- __below__ {String|Number} Set the zIndex to be below the value
- __top__ {Boolean} Set the zIndex to be above all other ZIndex components
- __bottom__ {Boolean} Set the zIndex to be below all other ZIndex components

Optional additional props:

- __important__ {Boolean} Set the `!important` flag on zIndex style value
 
The component will throw if not exactly one of these is given.

Examples:

```js
import ZIndex from 'react-z-index'

<ZIndex
  important top bottom
  index={ZIndex.vars.Modal}
  index={(props) => props.modal.priority * 100}
  above={100}
  below={ZIndex.vars.Overlay}></ZIndex>
```

## Decorator

### `@zIndex(value<String,Number,Function>) : Component`

When `value` is...

- a `Number`, sets the zIndex of a component to a constant:

    `@zIndex(100)`
    
- a `Function`, derives the zIndex of a component from its props:

    `@zIndex((props) => props.modal.priority * 100)`
    
- a `String`, sets the zIndex of a component by reference to a predefined var:

    `@zIndex(ZIndex.vars.Modal)`
    
Returns a React component.

Example:

```js
import { zIndex } from 'react-z-index'

@zIndex(ZIndex.vars.Modal)
return class Modal extends Component {
  render () {
    return (
      <div className='modal'>
        ...
      </div>
    )
  }
}
```

## Style
   
If you would like to use only the map of zIndex values you can do that too.

```js
import ZIndex from 'react-z-index'

// Inform lib of the value so we can pick it up elsewhere in the app
const zIndex = ZIndex.setVar('Modal', 100)

class Modal extends Component {
  render () {
    return (
      <div className='modal' style={{ zIndex }}></div>
    )
  }
}
```

## Contributing

All pull requests and issues welcome!

If you're not sure how to contribute, check out Kent C. Dodds'
[great video tutorials on egghead.io](https://egghead.io/lessons/javascript-identifying-how-to-contribute-to-an-open-source-project-on-github)!

## Author & License

`react-z-index` was created by [Sam Gluck](https://twitter.com/sdgluck) and is released under the MIT license.
