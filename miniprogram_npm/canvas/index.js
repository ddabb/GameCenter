module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1779863504303, function(require, module, exports) {
const Canvas = require('./lib/canvas')
const Image = require('./lib/image')
const CanvasRenderingContext2D = require('./lib/context2d')
const CanvasPattern = require('./lib/pattern')
const packageJson = require('./package.json')
const bindings = require('./lib/bindings')
const fs = require('fs')
const PNGStream = require('./lib/pngstream')
const PDFStream = require('./lib/pdfstream')
const JPEGStream = require('./lib/jpegstream')
const { DOMPoint, DOMMatrix } = require('./lib/DOMMatrix')

bindings.setDOMMatrix(DOMMatrix)

function createCanvas (width, height, type) {
  return new Canvas(width, height, type)
}

function createImageData (array, width, height) {
  return new bindings.ImageData(array, width, height)
}

function loadImage (src) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    function cleanup () {
      image.onload = null
      image.onerror = null
    }

    image.onload = () => { cleanup(); resolve(image) }
    image.onerror = (err) => { cleanup(); reject(err) }

    image.src = src
  })
}

/**
 * Resolve paths for registerFont. Must be called *before* creating a Canvas
 * instance.
 * @param src {string} Path to font file.
 * @param fontFace {{family: string, weight?: string, style?: string}} Object
 * specifying font information. `weight` and `style` default to `"normal"`.
 */
function registerFont (src, fontFace) {
  // TODO this doesn't need to be on Canvas; it should just be a static method
  // of `bindings`.
  return Canvas._registerFont(fs.realpathSync(src), fontFace)
}

/**
 * Unload all fonts from pango to free up memory
 */
function deregisterAllFonts () {
  return Canvas._deregisterAllFonts()
}

exports.Canvas = Canvas
exports.Context2d = CanvasRenderingContext2D // Legacy/compat export
exports.CanvasRenderingContext2D = CanvasRenderingContext2D
exports.CanvasGradient = bindings.CanvasGradient
exports.CanvasPattern = CanvasPattern
exports.Image = Image
exports.ImageData = bindings.ImageData
exports.PNGStream = PNGStream
exports.PDFStream = PDFStream
exports.JPEGStream = JPEGStream
exports.DOMMatrix = DOMMatrix
exports.DOMPoint = DOMPoint

exports.registerFont = registerFont
exports.deregisterAllFonts = deregisterAllFonts

exports.createCanvas = createCanvas
exports.createImageData = createImageData
exports.loadImage = loadImage

exports.backends = bindings.Backends

/** Library version. */
exports.version = packageJson.version
/** Cairo version. */
exports.cairoVersion = bindings.cairoVersion
/** jpeglib version. */
exports.jpegVersion = bindings.jpegVersion
/** gif_lib version. */
exports.gifVersion = bindings.gifVersion ? bindings.gifVersion.replace(/[^.\d]/g, '') : undefined
/** freetype version. */
exports.freetypeVersion = bindings.freetypeVersion
/** rsvg version. */
exports.rsvgVersion = bindings.rsvgVersion
/** pango version. */
exports.pangoVersion = bindings.pangoVersion

}, function(modId) {var map = {"./lib/canvas":1779863504304,"./lib/image":1779863504310,"./lib/context2d":1779863504306,"./lib/pattern":1779863504311,"./package.json":1779863504312,"./lib/bindings":1779863504305,"./lib/pngstream":1779863504307,"./lib/pdfstream":1779863504308,"./lib/jpegstream":1779863504309,"./lib/DOMMatrix":1779863504313}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504304, function(require, module, exports) {


/*!
 * Canvas
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

const bindings = require('./bindings')
const Canvas = module.exports = bindings.Canvas
const Context2d = require('./context2d')
const PNGStream = require('./pngstream')
const PDFStream = require('./pdfstream')
const JPEGStream = require('./jpegstream')
const FORMATS = ['image/png', 'image/jpeg']
const util = require('util')

// TODO || is for Node.js pre-v6.6.0
Canvas.prototype[util.inspect.custom || 'inspect'] = function () {
  return `[Canvas ${this.width}x${this.height}]`
}

Canvas.prototype.getContext = function (contextType, contextAttributes) {
  if (contextType == '2d') {
    const ctx = this._context2d || (this._context2d = new Context2d(this, contextAttributes))
    this.context = ctx
    ctx.canvas = this
    return ctx
  }
}

Canvas.prototype.pngStream =
Canvas.prototype.createPNGStream = function (options) {
  return new PNGStream(this, options)
}

Canvas.prototype.pdfStream =
Canvas.prototype.createPDFStream = function (options) {
  return new PDFStream(this, options)
}

Canvas.prototype.jpegStream =
Canvas.prototype.createJPEGStream = function (options) {
  return new JPEGStream(this, options)
}

Canvas.prototype.toDataURL = function (a1, a2, a3) {
  // valid arg patterns (args -> [type, opts, fn]):
  // [] -> ['image/png', null, null]
  // [qual] -> ['image/png', null, null]
  // [undefined] -> ['image/png', null, null]
  // ['image/png'] -> ['image/png', null, null]
  // ['image/png', qual] -> ['image/png', null, null]
  // [fn] -> ['image/png', null, fn]
  // [type, fn] -> [type, null, fn]
  // [undefined, fn] -> ['image/png', null, fn]
  // ['image/png', qual, fn] -> ['image/png', null, fn]
  // ['image/jpeg', fn] -> ['image/jpeg', null, fn]
  // ['image/jpeg', opts, fn] -> ['image/jpeg', opts, fn]
  // ['image/jpeg', qual, fn] -> ['image/jpeg', {quality: qual}, fn]
  // ['image/jpeg', undefined, fn] -> ['image/jpeg', null, fn]
  // ['image/jpeg'] -> ['image/jpeg', null, fn]
  // ['image/jpeg', opts] -> ['image/jpeg', opts, fn]
  // ['image/jpeg', qual] -> ['image/jpeg', {quality: qual}, fn]

  let type = 'image/png'
  let opts = {}
  let fn

  if (typeof a1 === 'function') {
    fn = a1
  } else {
    if (typeof a1 === 'string' && FORMATS.includes(a1.toLowerCase())) {
      type = a1.toLowerCase()
    }

    if (typeof a2 === 'function') {
      fn = a2
    } else {
      if (typeof a2 === 'object') {
        opts = a2
      } else if (typeof a2 === 'number') {
        opts = { quality: Math.max(0, Math.min(1, a2)) }
      }

      if (typeof a3 === 'function') {
        fn = a3
      } else if (undefined !== a3) {
        throw new TypeError(`${typeof a3} is not a function`)
      }
    }
  }

  if (this.width === 0 || this.height === 0) {
    // Per spec, if the bitmap has no pixels, return this string:
    const str = 'data:,'
    if (fn) {
      setTimeout(() => fn(null, str))
      return
    } else {
      return str
    }
  }

  if (fn) {
    this.toBuffer((err, buf) => {
      if (err) return fn(err)
      fn(null, `data:${type};base64,${buf.toString('base64')}`)
    }, type, opts)
  } else {
    return `data:${type};base64,${this.toBuffer(type, opts).toString('base64')}`
  }
}

}, function(modId) { var map = {"./bindings":1779863504305,"./context2d":1779863504306,"./pngstream":1779863504307,"./pdfstream":1779863504308,"./jpegstream":1779863504309}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504305, function(require, module, exports) {


const bindings = require('../build/Release/canvas.node')

module.exports = bindings

Object.defineProperty(bindings.Canvas.prototype, Symbol.toStringTag, {
  value: 'HTMLCanvasElement',
  configurable: true
})

Object.defineProperty(bindings.Image.prototype, Symbol.toStringTag, {
  value: 'HTMLImageElement',
  configurable: true
})

bindings.ImageData.prototype.toString = function () {
	return '[object ImageData]'
}

Object.defineProperty(bindings.ImageData.prototype, Symbol.toStringTag, {
  value: 'ImageData',
  configurable: true
})

bindings.CanvasGradient.prototype.toString = function () {
	return '[object CanvasGradient]'
}

Object.defineProperty(bindings.CanvasGradient.prototype, Symbol.toStringTag, {
  value: 'CanvasGradient',
  configurable: true
})

Object.defineProperty(bindings.CanvasPattern.prototype, Symbol.toStringTag, {
  value: 'CanvasPattern',
  configurable: true
})

Object.defineProperty(bindings.CanvasRenderingContext2d.prototype, Symbol.toStringTag, {
  value: 'CanvasRenderingContext2d',
  configurable: true
})

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504306, function(require, module, exports) {


/*!
 * Canvas - Context2d
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

const bindings = require('./bindings')

module.exports = bindings.CanvasRenderingContext2d

}, function(modId) { var map = {"./bindings":1779863504305}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504307, function(require, module, exports) {


/*!
 * Canvas - PNGStream
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

const { Readable } = require('stream')
function noop () {}

class PNGStream extends Readable {
  constructor (canvas, options) {
    super()

    if (options &&
      options.palette instanceof Uint8ClampedArray &&
      options.palette.length % 4 !== 0) {
      throw new Error('Palette length must be a multiple of 4.')
    }
    this.canvas = canvas
    this.options = options || {}
  }

  _read () {
    // For now we're not controlling the c++ code's data emission, so we only
    // call canvas.streamPNGSync once and let it emit data at will.
    this._read = noop

    this.canvas.streamPNGSync((err, chunk, len) => {
      if (err) {
        this.emit('error', err)
      } else if (len) {
        this.push(chunk)
      } else {
        this.push(null)
      }
    }, this.options)
  }
}

module.exports = PNGStream

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504308, function(require, module, exports) {


/*!
 * Canvas - PDFStream
 */

const { Readable } = require('stream')
function noop () {}

class PDFStream extends Readable {
  constructor (canvas, options) {
    super()

    this.canvas = canvas
    this.options = options
  }

  _read () {
    // For now we're not controlling the c++ code's data emission, so we only
    // call canvas.streamPDFSync once and let it emit data at will.
    this._read = noop

    this.canvas.streamPDFSync((err, chunk, len) => {
      if (err) {
        this.emit('error', err)
      } else if (len) {
        this.push(chunk)
      } else {
        this.push(null)
      }
    }, this.options)
  }
}

module.exports = PDFStream

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504309, function(require, module, exports) {


/*!
 * Canvas - JPEGStream
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

const { Readable } = require('stream')
function noop () {}

class JPEGStream extends Readable {
  constructor (canvas, options) {
    super()

    if (canvas.streamJPEGSync === undefined) {
      throw new Error('node-canvas was built without JPEG support.')
    }

    this.options = options
    this.canvas = canvas
  }

  _read () {
    // For now we're not controlling the c++ code's data emission, so we only
    // call canvas.streamJPEGSync once and let it emit data at will.
    this._read = noop

    this.canvas.streamJPEGSync(this.options, (err, chunk) => {
      if (err) {
        this.emit('error', err)
      } else if (chunk) {
        this.push(chunk)
      } else {
        this.push(null)
      }
    })
  }
};

module.exports = JPEGStream

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504310, function(require, module, exports) {


/*!
 * Canvas - Image
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

const bindings = require('./bindings')
const Image = module.exports = bindings.Image
const util = require('util')

const { GetSource, SetSource } = bindings

Object.defineProperty(Image.prototype, 'src', {
  /**
   * src setter. Valid values:
   *  * `data:` URI
   *  * Local file path
   *  * HTTP or HTTPS URL
   *  * Buffer containing image data (i.e. not a `data:` URI stored in a Buffer)
   *
   * @param {String|Buffer} val filename, buffer, data URI, URL
   * @api public
   */
  set (val) {
    if (typeof val === 'string') {
      if (/^\s*data:/.test(val)) { // data: URI
        const commaI = val.indexOf(',')
        // 'base64' must come before the comma
        const isBase64 = val.lastIndexOf('base64', commaI) !== -1
        const content = val.slice(commaI + 1)
        setSource(this, Buffer.from(content, isBase64 ? 'base64' : 'utf8'), val)
      } else if (/^\s*https?:\/\//.test(val)) { // remote URL
        const onerror = err => {
          if (typeof this.onerror === 'function') {
            this.onerror(err)
          } else {
            throw err
          }
        }

        fetch(val, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36' }
        })
          .then(res => {
            if (!res.ok) {
              throw new Error(`Server responded with ${res.status}`)
            }
            return res.arrayBuffer()
          })
          .then(data => {
            setSource(this, Buffer.from(data))
          })
          .catch(onerror)
      } else { // local file path assumed
        setSource(this, val)
      }
    } else if (Buffer.isBuffer(val)) {
      setSource(this, val)
    } else {
      const err = new Error("Invalid image source")
      if (typeof this.onerror === 'function') this.onerror(err)
      else throw err
    }
  },

  get () {
    // TODO https://github.com/Automattic/node-canvas/issues/118
    return getSource(this)
  },

  configurable: true
})

// TODO || is for Node.js pre-v6.6.0
Image.prototype[util.inspect.custom || 'inspect'] = function () {
  return '[Image' +
    (this.complete ? ':' + this.width + 'x' + this.height : '') +
    (this.src ? ' ' + this.src : '') +
    (this.complete ? ' complete' : '') +
    ']'
}

function getSource (img) {
  return img._originalSource || GetSource.call(img)
}

function setSource (img, src, origSrc) {
  SetSource.call(img, src)
  img._originalSource = origSrc
}

}, function(modId) { var map = {"./bindings":1779863504305}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504311, function(require, module, exports) {


/*!
 * Canvas - CanvasPattern
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

const bindings = require('./bindings')

module.exports = bindings.CanvasPattern

bindings.CanvasPattern.prototype.toString = function () {
	return '[object CanvasPattern]'
}

}, function(modId) { var map = {"./bindings":1779863504305}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504312, function(require, module, exports) {
module.exports = {
  "name": "canvas",
  "description": "Canvas graphics API backed by Cairo",
  "version": "3.2.3",
  "author": "TJ Holowaychuk <tj@learnboost.com>",
  "main": "index.js",
  "browser": "browser.js",
  "types": "index.d.ts",
  "contributors": [
    "Nathan Rajlich <nathan@tootallnate.net>",
    "Rod Vagg <r@va.gg>",
    "Juriy Zaytsev <kangax@gmail.com>"
  ],
  "keywords": [
    "canvas",
    "graphic",
    "graphics",
    "pixman",
    "cairo",
    "image",
    "images",
    "pdf"
  ],
  "homepage": "https://github.com/Automattic/node-canvas",
  "repository": "git://github.com/Automattic/node-canvas.git",
  "scripts": {
    "prebenchmark": "node-gyp build",
    "benchmark": "node benchmarks/run.js",
    "lint": "standard examples/*.js test/server.js test/public/*.js benchmarks/run.js lib/context2d.js util/has_lib.js browser.js index.js",
    "test": "mocha test/*.test.js",
    "pretest-server": "node-gyp build",
    "test-server": "node test/server.js",
    "generate-wpt": "node ./test/wpt/generate.js",
    "test-wpt": "mocha test/wpt/generated/*.js",
    "install": "prebuild-install -r napi || node-gyp rebuild",
    "tsd": "tsd"
  },
  "files": [
    "binding.gyp",
    "browser.js",
    "index.d.ts",
    "index.js",
    "lib/",
    "src/",
    "util/"
  ],
  "dependencies": {
    "node-addon-api": "^7.0.0",
    "prebuild-install": "^7.1.3"
  },
  "devDependencies": {
    "@types/node": "^10.12.18",
    "assert-rejects": "^1.0.0",
    "express": "^4.16.3",
    "js-yaml": "^4.1.0",
    "mocha": "^5.2.0",
    "pixelmatch": "^4.0.2",
    "standard": "^12.0.1",
    "tsd": "^0.29.0",
    "typescript": "^4.2.2"
  },
  "engines": {
    "node": "^18.12.0 || >= 20.9.0"
  },
  "binary": {
    "napi_versions": [
      7
    ]
  },
  "license": "MIT"
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504313, function(require, module, exports) {


const util = require('util')

// DOMMatrix per https://drafts.fxtf.org/geometry/#DOMMatrix

class DOMPoint {
  constructor (x, y, z, w) {
    if (typeof x === 'object' && x !== null) {
      w = x.w
      z = x.z
      y = x.y
      x = x.x
    }
    this.x = typeof x === 'number' ? x : 0
    this.y = typeof y === 'number' ? y : 0
    this.z = typeof z === 'number' ? z : 0
    this.w = typeof w === 'number' ? w : 1
  }

  matrixTransform(init) {
    // TODO: this next line is wrong. matrixTransform is supposed to only take
    // an object with the DOMMatrix properties called DOMMatrixInit
    const m = init instanceof DOMMatrix ? init : new DOMMatrix(init)
    return m.transformPoint(this)
  }

  toJSON() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      w: this.w
    }
  }

  static fromPoint(other) {
    return new this(other.x, other.y, other.z, other.w)
  }
}

// Constants to index into _values (col-major)
const M11 = 0; const M12 = 1; const M13 = 2; const M14 = 3
const M21 = 4; const M22 = 5; const M23 = 6; const M24 = 7
const M31 = 8; const M32 = 9; const M33 = 10; const M34 = 11
const M41 = 12; const M42 = 13; const M43 = 14; const M44 = 15

const DEGREE_PER_RAD = 180 / Math.PI
const RAD_PER_DEGREE = Math.PI / 180

function parseMatrix (init) {
  let parsed = init.replace('matrix(', '')
  parsed = parsed.split(',', 7) // 6 + 1 to handle too many params
  if (parsed.length !== 6) throw new Error(`Failed to parse ${init}`)
  parsed = parsed.map(parseFloat)
  return [
    parsed[0], parsed[1], 0, 0,
    parsed[2], parsed[3], 0, 0,
    0, 0, 1, 0,
    parsed[4], parsed[5], 0, 1
  ]
}

function parseMatrix3d (init) {
  let parsed = init.replace('matrix3d(', '')
  parsed = parsed.split(',', 17) // 16 + 1 to handle too many params
  if (parsed.length !== 16) throw new Error(`Failed to parse ${init}`)
  return parsed.map(parseFloat)
}

function parseTransform (tform) {
  const type = tform.split('(', 1)[0]
  switch (type) {
    case 'matrix':
      return parseMatrix(tform)
    case 'matrix3d':
      return parseMatrix3d(tform)
    // TODO This is supposed to support any CSS transform value.
    default:
      throw new Error(`${type} parsing not implemented`)
  }
}

class DOMMatrix {
  constructor (init) {
    this._is2D = true
    this._values = new Float64Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ])

    let i

    if (typeof init === 'string') { // parse CSS transformList
      if (init === '') return // default identity matrix
      const tforms = init.split(/\)\s+/, 20).map(parseTransform)
      if (tforms.length === 0) return
      init = tforms[0]
      for (i = 1; i < tforms.length; i++) init = multiply(tforms[i], init)
    }

    i = 0
    if (init && init.length === 6) {
      setNumber2D(this, M11, init[i++])
      setNumber2D(this, M12, init[i++])
      setNumber2D(this, M21, init[i++])
      setNumber2D(this, M22, init[i++])
      setNumber2D(this, M41, init[i++])
      setNumber2D(this, M42, init[i++])
    } else if (init && init.length === 16) {
      setNumber2D(this, M11, init[i++])
      setNumber2D(this, M12, init[i++])
      setNumber3D(this, M13, init[i++])
      setNumber3D(this, M14, init[i++])
      setNumber2D(this, M21, init[i++])
      setNumber2D(this, M22, init[i++])
      setNumber3D(this, M23, init[i++])
      setNumber3D(this, M24, init[i++])
      setNumber3D(this, M31, init[i++])
      setNumber3D(this, M32, init[i++])
      setNumber3D(this, M33, init[i++])
      setNumber3D(this, M34, init[i++])
      setNumber2D(this, M41, init[i++])
      setNumber2D(this, M42, init[i++])
      setNumber3D(this, M43, init[i++])
      setNumber3D(this, M44, init[i])
    } else if (init !== undefined) {
      throw new TypeError('Expected string or array.')
    }
  }

  toString () {
    return this.is2D
      ? `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
      : `matrix3d(${this._values.join(', ')})`
  }

  multiply (other) {
    return newInstance(this._values).multiplySelf(other)
  }

  multiplySelf (other) {
    this._values = multiply(other._values, this._values)
    if (!other.is2D) this._is2D = false
    return this
  }

  preMultiplySelf (other) {
    this._values = multiply(this._values, other._values)
    if (!other.is2D) this._is2D = false
    return this
  }

  translate (tx, ty, tz) {
    return newInstance(this._values).translateSelf(tx, ty, tz)
  }

  translateSelf (tx, ty, tz) {
    if (typeof tx !== 'number') tx = 0
    if (typeof ty !== 'number') ty = 0
    if (typeof tz !== 'number') tz = 0
    this._values = multiply([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ], this._values)
    if (tz !== 0) this._is2D = false
    return this
  }

  scale (scaleX, scaleY, scaleZ, originX, originY, originZ) {
    return newInstance(this._values).scaleSelf(scaleX, scaleY, scaleZ, originX, originY, originZ)
  }

  scale3d (scale, originX, originY, originZ) {
    return newInstance(this._values).scale3dSelf(scale, originX, originY, originZ)
  }

  scale3dSelf (scale, originX, originY, originZ) {
    return this.scaleSelf(scale, scale, scale, originX, originY, originZ)
  }

  /**
   * @deprecated
   */
  scaleNonUniform(scaleX, scaleY) {
    return this.scale(scaleX, scaleY)
  }

  scaleSelf (scaleX, scaleY, scaleZ, originX, originY, originZ) {
    // Not redundant with translate's checks because we need to negate the values later.
    if (typeof originX !== 'number') originX = 0
    if (typeof originY !== 'number') originY = 0
    if (typeof originZ !== 'number') originZ = 0
    this.translateSelf(originX, originY, originZ)
    if (typeof scaleX !== 'number') scaleX = 1
    if (typeof scaleY !== 'number') scaleY = scaleX
    if (typeof scaleZ !== 'number') scaleZ = 1
    this._values = multiply([
      scaleX, 0, 0, 0,
      0, scaleY, 0, 0,
      0, 0, scaleZ, 0,
      0, 0, 0, 1
    ], this._values)
    this.translateSelf(-originX, -originY, -originZ)
    if (scaleZ !== 1 || originZ !== 0) this._is2D = false
    return this
  }

  rotateFromVector (x, y) {
    return newInstance(this._values).rotateFromVectorSelf(x, y)
  }

  rotateFromVectorSelf (x, y) {
    if (typeof x !== 'number') x = 0
    if (typeof y !== 'number') y = 0
    const theta = (x === 0 && y === 0) ? 0 : Math.atan2(y, x) * DEGREE_PER_RAD
    return this.rotateSelf(theta)
  }

  rotate (rotX, rotY, rotZ) {
    return newInstance(this._values).rotateSelf(rotX, rotY, rotZ)
  }

  rotateSelf (rotX, rotY, rotZ) {
    if (rotY === undefined && rotZ === undefined) {
      rotZ = rotX
      rotX = rotY = 0
    }
    if (typeof rotY !== 'number') rotY = 0
    if (typeof rotZ !== 'number') rotZ = 0
    if (rotX !== 0 || rotY !== 0) this._is2D = false
    rotX *= RAD_PER_DEGREE
    rotY *= RAD_PER_DEGREE
    rotZ *= RAD_PER_DEGREE
    let c, s
    c = Math.cos(rotZ)
    s = Math.sin(rotZ)
    this._values = multiply([
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ], this._values)
    c = Math.cos(rotY)
    s = Math.sin(rotY)
    this._values = multiply([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ], this._values)
    c = Math.cos(rotX)
    s = Math.sin(rotX)
    this._values = multiply([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ], this._values)
    return this
  }

  rotateAxisAngle (x, y, z, angle) {
    return newInstance(this._values).rotateAxisAngleSelf(x, y, z, angle)
  }

  rotateAxisAngleSelf (x, y, z, angle) {
    if (typeof x !== 'number') x = 0
    if (typeof y !== 'number') y = 0
    if (typeof z !== 'number') z = 0
    // Normalize axis
    const length = Math.sqrt(x * x + y * y + z * z)
    if (length === 0) return this
    if (length !== 1) {
      x /= length
      y /= length
      z /= length
    }
    angle *= RAD_PER_DEGREE
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const t = 1 - c
    const tx = t * x
    const ty = t * y
    // NB: This is the generic transform. If the axis is a major axis, there are
    // faster transforms.
    this._values = multiply([
      tx * x + c, tx * y + s * z, tx * z - s * y, 0,
      tx * y - s * z, ty * y + c, ty * z + s * x, 0,
      tx * z + s * y, ty * z - s * x, t * z * z + c, 0,
      0, 0, 0, 1
    ], this._values)
    if (x !== 0 || y !== 0) this._is2D = false
    return this
  }

  skewX (sx) {
    return newInstance(this._values).skewXSelf(sx)
  }

  skewXSelf (sx) {
    if (typeof sx !== 'number') return this
    const t = Math.tan(sx * RAD_PER_DEGREE)
    this._values = multiply([
      1, 0, 0, 0,
      t, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ], this._values)
    return this
  }

  skewY (sy) {
    return newInstance(this._values).skewYSelf(sy)
  }

  skewYSelf (sy) {
    if (typeof sy !== 'number') return this
    const t = Math.tan(sy * RAD_PER_DEGREE)
    this._values = multiply([
      1, t, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ], this._values)
    return this
  }

  flipX () {
    return newInstance(multiply([
      -1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ], this._values))
  }

  flipY () {
    return newInstance(multiply([
      1, 0, 0, 0,
      0, -1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ], this._values))
  }

  inverse () {
    return newInstance(this._values).invertSelf()
  }

  invertSelf () {
    const m = this._values
    const inv = m.map(v => 0)

    inv[0] = m[5] * m[10] * m[15] -
            m[5] * m[11] * m[14] -
            m[9] * m[6] * m[15] +
            m[9] * m[7] * m[14] +
            m[13] * m[6] * m[11] -
            m[13] * m[7] * m[10]

    inv[4] = -m[4] * m[10] * m[15] +
            m[4] * m[11] * m[14] +
            m[8] * m[6] * m[15] -
            m[8] * m[7] * m[14] -
            m[12] * m[6] * m[11] +
            m[12] * m[7] * m[10]

    inv[8] = m[4] * m[9] * m[15] -
            m[4] * m[11] * m[13] -
            m[8] * m[5] * m[15] +
            m[8] * m[7] * m[13] +
            m[12] * m[5] * m[11] -
            m[12] * m[7] * m[9]

    inv[12] = -m[4] * m[9] * m[14] +
            m[4] * m[10] * m[13] +
            m[8] * m[5] * m[14] -
            m[8] * m[6] * m[13] -
            m[12] * m[5] * m[10] +
            m[12] * m[6] * m[9]

    // If the determinant is zero, this matrix cannot be inverted, and all
    // values should be set to NaN, with the is2D flag set to false.

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12]

    if (det === 0) {
      this._values = m.map(v => NaN)
      this._is2D = false
      return this
    }

    inv[1] = -m[1] * m[10] * m[15] +
            m[1] * m[11] * m[14] +
            m[9] * m[2] * m[15] -
            m[9] * m[3] * m[14] -
            m[13] * m[2] * m[11] +
            m[13] * m[3] * m[10]

    inv[5] = m[0] * m[10] * m[15] -
            m[0] * m[11] * m[14] -
            m[8] * m[2] * m[15] +
            m[8] * m[3] * m[14] +
            m[12] * m[2] * m[11] -
            m[12] * m[3] * m[10]

    inv[9] = -m[0] * m[9] * m[15] +
            m[0] * m[11] * m[13] +
            m[8] * m[1] * m[15] -
            m[8] * m[3] * m[13] -
            m[12] * m[1] * m[11] +
            m[12] * m[3] * m[9]

    inv[13] = m[0] * m[9] * m[14] -
            m[0] * m[10] * m[13] -
            m[8] * m[1] * m[14] +
            m[8] * m[2] * m[13] +
            m[12] * m[1] * m[10] -
            m[12] * m[2] * m[9]

    inv[2] = m[1] * m[6] * m[15] -
            m[1] * m[7] * m[14] -
            m[5] * m[2] * m[15] +
            m[5] * m[3] * m[14] +
            m[13] * m[2] * m[7] -
            m[13] * m[3] * m[6]

    inv[6] = -m[0] * m[6] * m[15] +
            m[0] * m[7] * m[14] +
            m[4] * m[2] * m[15] -
            m[4] * m[3] * m[14] -
            m[12] * m[2] * m[7] +
            m[12] * m[3] * m[6]

    inv[10] = m[0] * m[5] * m[15] -
            m[0] * m[7] * m[13] -
            m[4] * m[1] * m[15] +
            m[4] * m[3] * m[13] +
            m[12] * m[1] * m[7] -
            m[12] * m[3] * m[5]

    inv[14] = -m[0] * m[5] * m[14] +
            m[0] * m[6] * m[13] +
            m[4] * m[1] * m[14] -
            m[4] * m[2] * m[13] -
            m[12] * m[1] * m[6] +
            m[12] * m[2] * m[5]

    inv[3] = -m[1] * m[6] * m[11] +
            m[1] * m[7] * m[10] +
            m[5] * m[2] * m[11] -
            m[5] * m[3] * m[10] -
            m[9] * m[2] * m[7] +
            m[9] * m[3] * m[6]

    inv[7] = m[0] * m[6] * m[11] -
            m[0] * m[7] * m[10] -
            m[4] * m[2] * m[11] +
            m[4] * m[3] * m[10] +
            m[8] * m[2] * m[7] -
            m[8] * m[3] * m[6]

    inv[11] = -m[0] * m[5] * m[11] +
            m[0] * m[7] * m[9] +
            m[4] * m[1] * m[11] -
            m[4] * m[3] * m[9] -
            m[8] * m[1] * m[7] +
            m[8] * m[3] * m[5]

    inv[15] = m[0] * m[5] * m[10] -
            m[0] * m[6] * m[9] -
            m[4] * m[1] * m[10] +
            m[4] * m[2] * m[9] +
            m[8] * m[1] * m[6] -
            m[8] * m[2] * m[5]

    inv.forEach((v, i) => { inv[i] = v / det })
    this._values = inv
    return this
  }

  setMatrixValue (transformList) {
    const temp = new DOMMatrix(transformList)
    this._values = temp._values
    this._is2D = temp._is2D
    return this
  }

  transformPoint (point) {
    point = new DOMPoint(point)
    const x = point.x
    const y = point.y
    const z = point.z
    const w = point.w
    const values = this._values
    const nx = values[M11] * x + values[M21] * y + values[M31] * z + values[M41] * w
    const ny = values[M12] * x + values[M22] * y + values[M32] * z + values[M42] * w
    const nz = values[M13] * x + values[M23] * y + values[M33] * z + values[M43] * w
    const nw = values[M14] * x + values[M24] * y + values[M34] * z + values[M44] * w
    return new DOMPoint(nx, ny, nz, nw)
  }

  toFloat32Array () {
    return Float32Array.from(this._values)
  }

  toFloat64Array () {
    return this._values.slice(0)
  }

  static fromMatrix (init) {
    if (!(init instanceof DOMMatrix)) throw new TypeError('Expected DOMMatrix')
    return new DOMMatrix(init._values)
  }

  static fromFloat32Array (init) {
    if (!(init instanceof Float32Array)) throw new TypeError('Expected Float32Array')
    return new DOMMatrix(init)
  }

  static fromFloat64Array (init) {
    if (!(init instanceof Float64Array)) throw new TypeError('Expected Float64Array')
    return new DOMMatrix(init)
  }

  [util.inspect.custom || 'inspect'] (depth, options) {
    if (depth < 0) return '[DOMMatrix]'

    return `DOMMatrix [
      a: ${this.a}
      b: ${this.b}
      c: ${this.c}
      d: ${this.d}
      e: ${this.e}
      f: ${this.f}
      m11: ${this.m11}
      m12: ${this.m12}
      m13: ${this.m13}
      m14: ${this.m14}
      m21: ${this.m21}
      m22: ${this.m22}
      m23: ${this.m23}
      m23: ${this.m23}
      m31: ${this.m31}
      m32: ${this.m32}
      m33: ${this.m33}
      m34: ${this.m34}
      m41: ${this.m41}
      m42: ${this.m42}
      m43: ${this.m43}
      m44: ${this.m44}
      is2D: ${this.is2D}
      isIdentity: ${this.isIdentity} ]`
  }
}

/**
 * Checks that `value` is a number and sets the value.
 */
function setNumber2D (receiver, index, value) {
  if (typeof value !== 'number') throw new TypeError('Expected number')
  return (receiver._values[index] = value)
}

/**
 * Checks that `value` is a number, sets `_is2D = false` if necessary and sets
 * the value.
 */
function setNumber3D (receiver, index, value) {
  if (typeof value !== 'number') throw new TypeError('Expected number')
  if (index === M33 || index === M44) {
    if (value !== 1) receiver._is2D = false
  } else if (value !== 0) receiver._is2D = false
  return (receiver._values[index] = value)
}

Object.defineProperties(DOMMatrix.prototype, {
  m11: { get () { return this._values[M11] }, set (v) { return setNumber2D(this, M11, v) } },
  m12: { get () { return this._values[M12] }, set (v) { return setNumber2D(this, M12, v) } },
  m13: { get () { return this._values[M13] }, set (v) { return setNumber3D(this, M13, v) } },
  m14: { get () { return this._values[M14] }, set (v) { return setNumber3D(this, M14, v) } },
  m21: { get () { return this._values[M21] }, set (v) { return setNumber2D(this, M21, v) } },
  m22: { get () { return this._values[M22] }, set (v) { return setNumber2D(this, M22, v) } },
  m23: { get () { return this._values[M23] }, set (v) { return setNumber3D(this, M23, v) } },
  m24: { get () { return this._values[M24] }, set (v) { return setNumber3D(this, M24, v) } },
  m31: { get () { return this._values[M31] }, set (v) { return setNumber3D(this, M31, v) } },
  m32: { get () { return this._values[M32] }, set (v) { return setNumber3D(this, M32, v) } },
  m33: { get () { return this._values[M33] }, set (v) { return setNumber3D(this, M33, v) } },
  m34: { get () { return this._values[M34] }, set (v) { return setNumber3D(this, M34, v) } },
  m41: { get () { return this._values[M41] }, set (v) { return setNumber2D(this, M41, v) } },
  m42: { get () { return this._values[M42] }, set (v) { return setNumber2D(this, M42, v) } },
  m43: { get () { return this._values[M43] }, set (v) { return setNumber3D(this, M43, v) } },
  m44: { get () { return this._values[M44] }, set (v) { return setNumber3D(this, M44, v) } },

  a: { get () { return this.m11 }, set (v) { return (this.m11 = v) } },
  b: { get () { return this.m12 }, set (v) { return (this.m12 = v) } },
  c: { get () { return this.m21 }, set (v) { return (this.m21 = v) } },
  d: { get () { return this.m22 }, set (v) { return (this.m22 = v) } },
  e: { get () { return this.m41 }, set (v) { return (this.m41 = v) } },
  f: { get () { return this.m42 }, set (v) { return (this.m42 = v) } },

  is2D: { get () { return this._is2D } }, // read-only

  isIdentity: {
    get () {
      const values = this._values
      return (values[M11] === 1 && values[M12] === 0 && values[M13] === 0 && values[M14] === 0 &&
             values[M21] === 0 && values[M22] === 1 && values[M23] === 0 && values[M24] === 0 &&
             values[M31] === 0 && values[M32] === 0 && values[M33] === 1 && values[M34] === 0 &&
             values[M41] === 0 && values[M42] === 0 && values[M43] === 0 && values[M44] === 1)
    }
  },

  toJSON: {
    value() {
      return {
        a: this.a,
        b: this.b,
        c: this.c,
        d: this.d,
        e: this.e,
        f: this.f,
        m11: this.m11,
        m12: this.m12,
        m13: this.m13,
        m14: this.m14,
        m21: this.m21,
        m22: this.m22,
        m23: this.m23,
        m23: this.m23,
        m31: this.m31,
        m32: this.m32,
        m33: this.m33,
        m34: this.m34,
        m41: this.m41,
        m42: this.m42,
        m43: this.m43,
        m44: this.m44,
        is2D: this.is2D,
        isIdentity: this.isIdentity,
      }
    }
  }
})

/**
 * Instantiates a DOMMatrix, bypassing the constructor.
 * @param {Float64Array} values Value to assign to `_values`. This is assigned
 *   without copying (okay because all usages are followed by a  multiply).
 */
function newInstance (values) {
  const instance = Object.create(DOMMatrix.prototype)
  instance.constructor = DOMMatrix
  instance._is2D = true
  instance._values = values
  return instance
}

function multiply (A, B) {
  const dest = new Float64Array(16)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += A[i * 4 + k] * B[k * 4 + j]
      }
      dest[i * 4 + j] = sum
    }
  }
  return dest
}

module.exports = { DOMMatrix, DOMPoint }

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1779863504303);
})()
//miniprogram-npm-outsideDeps=["fs","util","../build/Release/canvas.node","stream"]
//# sourceMappingURL=index.js.map