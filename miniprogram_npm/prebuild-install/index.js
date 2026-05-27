module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1779863504337, function(require, module, exports) {
exports.download = require('./download')

}, function(modId) {var map = {"./download":1779863504338}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504338, function(require, module, exports) {
const path = require('path')
const fs = require('fs')
const get = require('simple-get')
const pump = require('pump')
const tfs = require('tar-fs')
const zlib = require('zlib')
const util = require('./util')
const error = require('./error')
const proxy = require('./proxy')
const mkdirp = require('mkdirp-classic')

function downloadPrebuild (downloadUrl, opts, cb) {
  let cachedPrebuild = util.cachedPrebuild(downloadUrl)
  const localPrebuild = util.localPrebuild(downloadUrl, opts)
  const tempFile = util.tempFile(cachedPrebuild)
  const log = opts.log || util.noopLogger

  if (opts.nolocal) return download()

  log.info('looking for local prebuild @', localPrebuild)
  fs.access(localPrebuild, fs.R_OK | fs.W_OK, function (err) {
    if (err && err.code === 'ENOENT') {
      return download()
    }

    log.info('found local prebuild')
    cachedPrebuild = localPrebuild
    unpack()
  })

  function download () {
    ensureNpmCacheDir(function (err) {
      if (err) return onerror(err)

      log.info('looking for cached prebuild @', cachedPrebuild)
      fs.access(cachedPrebuild, fs.R_OK | fs.W_OK, function (err) {
        if (!(err && err.code === 'ENOENT')) {
          log.info('found cached prebuild')
          return unpack()
        }

        log.http('request', 'GET ' + downloadUrl)
        const reqOpts = proxy({ url: downloadUrl }, opts)

        if (opts.token) {
          reqOpts.headers = {
            'User-Agent': 'simple-get',
            Accept: 'application/octet-stream',
            Authorization: 'token ' + opts.token
          }
        }

        const req = get(reqOpts, function (err, res) {
          if (err) return onerror(err)
          log.http(res.statusCode, downloadUrl)
          if (res.statusCode !== 200) return onerror()
          mkdirp(util.prebuildCache(), function () {
            log.info('downloading to @', tempFile)
            pump(res, fs.createWriteStream(tempFile), function (err) {
              if (err) return onerror(err)
              fs.rename(tempFile, cachedPrebuild, function (err) {
                if (err) return cb(err)
                log.info('renaming to @', cachedPrebuild)
                unpack()
              })
            })
          })
        })

        req.setTimeout(30 * 1000, function () {
          req.abort()
        })
      })

      function onerror (err) {
        fs.unlink(tempFile, function () {
          cb(err || error.noPrebuilts(opts))
        })
      }
    })
  }

  function unpack () {
    let binaryName

    const updateName = opts.updateName || function (entry) {
      if (/\.node$/i.test(entry.name)) binaryName = entry.name
    }

    log.info('unpacking @', cachedPrebuild)

    const options = {
      readable: true,
      writable: true,
      hardlinkAsFilesFallback: true
    }
    const extract = tfs.extract(opts.path, options).on('entry', updateName)

    pump(fs.createReadStream(cachedPrebuild), zlib.createGunzip(), extract,
      function (err) {
        if (err) return cb(err)

        let resolved
        if (binaryName) {
          try {
            resolved = path.resolve(opts.path || '.', binaryName)
          } catch (err) {
            return cb(err)
          }
          log.info('unpack', 'resolved to ' + resolved)

          if (opts.runtime === 'node' && opts.platform === process.platform && opts.abi === process.versions.modules && opts.arch === process.arch) {
            try {
              require(resolved)
            } catch (err) {
              return cb(err)
            }
            log.info('unpack', 'required ' + resolved + ' successfully')
          }
        }

        cb(null, resolved)
      })
  }

  function ensureNpmCacheDir (cb) {
    const cacheFolder = util.npmCache()
    fs.access(cacheFolder, fs.R_OK | fs.W_OK, function (err) {
      if (err && err.code === 'ENOENT') {
        return makeNpmCacheDir()
      }
      cb(err)
    })

    function makeNpmCacheDir () {
      log.info('npm cache directory missing, creating it...')
      mkdirp(cacheFolder, cb)
    }
  }
}

module.exports = downloadPrebuild

}, function(modId) { var map = {"./util":1779863504339,"./error":1779863504340,"./proxy":1779863504341}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504339, function(require, module, exports) {
const path = require('path')
const github = require('github-from-package')
const home = require('os').homedir
const crypto = require('crypto')
const expandTemplate = require('expand-template')()

function getDownloadUrl (opts) {
  const pkgName = opts.pkg.name.replace(/^@[a-zA-Z0-9_\-.~]+\//, '')
  return expandTemplate(urlTemplate(opts), {
    name: pkgName,
    package_name: pkgName,
    version: opts.pkg.version,
    major: opts.pkg.version.split('.')[0],
    minor: opts.pkg.version.split('.')[1],
    patch: opts.pkg.version.split('.')[2],
    prerelease: opts.pkg.version.split('-')[1],
    build: opts.pkg.version.split('+')[1],
    abi: opts.abi || process.versions.modules,
    node_abi: process.versions.modules,
    runtime: opts.runtime || 'node',
    platform: opts.platform,
    arch: opts.arch,
    libc: opts.libc || '',
    configuration: (opts.debug ? 'Debug' : 'Release'),
    module_name: opts.pkg.binary && opts.pkg.binary.module_name,
    tag_prefix: opts['tag-prefix']
  })
}

function getApiUrl (opts) {
  return github(opts.pkg).replace('github.com', 'api.github.com/repos') + '/releases'
}

function getAssetUrl (opts, assetId) {
  return getApiUrl(opts) + '/assets/' + assetId
}

function urlTemplate (opts) {
  if (typeof opts.download === 'string') {
    return opts.download
  }

  const packageName = '{name}-v{version}-{runtime}-v{abi}-{platform}{libc}-{arch}.tar.gz'
  const hostMirrorUrl = getHostMirrorUrl(opts)

  if (hostMirrorUrl) {
    return hostMirrorUrl + '/{tag_prefix}{version}/' + packageName
  }

  if (opts.pkg.binary && opts.pkg.binary.host) {
    return [
      opts.pkg.binary.host,
      opts.pkg.binary.remote_path,
      opts.pkg.binary.package_name || packageName
    ].map(function (path) {
      return trimSlashes(path)
    }).filter(Boolean).join('/')
  }

  return github(opts.pkg) + '/releases/download/{tag_prefix}{version}/' + packageName
}

function getEnvPrefix (pkgName) {
  return 'npm_config_' + (pkgName || '').replace(/[^a-zA-Z0-9]/g, '_').replace(/^_/, '')
}

function getHostMirrorUrl (opts) {
  const propName = getEnvPrefix(opts.pkg.name) + '_binary_host'
  return process.env[propName] || process.env[propName + '_mirror']
}

function trimSlashes (str) {
  if (str) return str.replace(/^\.\/|^\/|\/$/g, '')
}

function cachedPrebuild (url) {
  const digest = crypto.createHash('sha512').update(url).digest('hex').slice(0, 6)
  return path.join(prebuildCache(), digest + '-' + path.basename(url).replace(/[^a-zA-Z0-9.]+/g, '-'))
}

function npmCache () {
  const env = process.env
  return env.npm_config_cache || (env.APPDATA ? path.join(env.APPDATA, 'npm-cache') : path.join(home(), '.npm'))
}

function prebuildCache () {
  return path.join(npmCache(), '_prebuilds')
}

function tempFile (cached) {
  return cached + '.' + process.pid + '-' + Math.random().toString(16).slice(2) + '.tmp'
}

function packageOrigin (env, pkg) {
  // npm <= 6: metadata is stored on disk in node_modules
  if (pkg._from) {
    return pkg._from
  }

  // npm 7: metadata is exposed to environment by arborist
  if (env.npm_package_from) {
    // NOTE: seems undefined atm (npm 7.0.2)
    return env.npm_package_from
  }

  if (env.npm_package_resolved) {
    // NOTE: not sure about the difference with _from, but it's all we have
    return env.npm_package_resolved
  }
}

function localPrebuild (url, opts) {
  const propName = getEnvPrefix(opts.pkg.name) + '_local_prebuilds'
  const prefix = process.env[propName] || opts['local-prebuilds'] || 'prebuilds'
  return path.join(prefix, path.basename(url))
}

const noopLogger = {
  http: function () {},
  silly: function () {},
  debug: function () {},
  info: function () {},
  warn: function () {},
  error: function () {},
  critical: function () {},
  alert: function () {},
  emergency: function () {},
  notice: function () {},
  verbose: function () {},
  fatal: function () {}
}

exports.getDownloadUrl = getDownloadUrl
exports.getApiUrl = getApiUrl
exports.getAssetUrl = getAssetUrl
exports.urlTemplate = urlTemplate
exports.cachedPrebuild = cachedPrebuild
exports.localPrebuild = localPrebuild
exports.prebuildCache = prebuildCache
exports.npmCache = npmCache
exports.tempFile = tempFile
exports.packageOrigin = packageOrigin
exports.noopLogger = noopLogger

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504340, function(require, module, exports) {
exports.noPrebuilts = function (opts) {
  return new Error([
    'No prebuilt binaries found',
    '(target=' + opts.target,
    'runtime=' + opts.runtime,
    'arch=' + opts.arch,
    'libc=' + opts.libc,
    'platform=' + opts.platform + ')'
  ].join(' '))
}

exports.invalidArchive = function () {
  return new Error('Missing .node file in archive')
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504341, function(require, module, exports) {
const url = require('url')
const tunnel = require('tunnel-agent')
const util = require('./util')

function applyProxy (reqOpts, opts) {
  const log = opts.log || util.noopLogger

  const proxy = opts['https-proxy'] || opts.proxy

  if (proxy) {
    // eslint-disable-next-line node/no-deprecated-api
    const parsedDownloadUrl = url.parse(reqOpts.url)
    // eslint-disable-next-line node/no-deprecated-api
    const parsedProxy = url.parse(proxy)
    const uriProtocol = (parsedDownloadUrl.protocol === 'https:' ? 'https' : 'http')
    const proxyProtocol = (parsedProxy.protocol === 'https:' ? 'Https' : 'Http')
    const tunnelFnName = [uriProtocol, proxyProtocol].join('Over')
    reqOpts.agent = tunnel[tunnelFnName]({
      proxy: {
        host: parsedProxy.hostname,
        port: +parsedProxy.port,
        proxyAuth: parsedProxy.auth
      }
    })
    log.http('request', 'Proxy setup detected (Host: ' +
    parsedProxy.hostname + ', Port: ' +
      parsedProxy.port + ', Authentication: ' +
      (parsedProxy.auth ? 'Yes' : 'No') + ')' +
      ' Tunneling with ' + tunnelFnName)
  }

  return reqOpts
}

module.exports = applyProxy

}, function(modId) { var map = {"./util":1779863504339}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1779863504337);
})()
//miniprogram-npm-outsideDeps=["path","fs","simple-get","pump","tar-fs","zlib","mkdirp-classic","github-from-package","os","crypto","expand-template","url","tunnel-agent"]
//# sourceMappingURL=index.js.map