module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1779863504333, function(require, module, exports) {
var semver = require('semver')

function getNextTarget (runtime, targets) {
  if (targets == null) targets = allTargets
  var latest = targets.filter(function (t) { return t.runtime === runtime }).slice(-1)[0]
  var increment = runtime === 'electron' ? 'minor' : 'major'
  var next = semver.inc(latest.target, increment)
  // Electron releases appear in the registry in their beta form, sometimes there is
  // no active beta line.  During this time we need to double bump
  if (runtime === 'electron' && semver.parse(latest.target).prerelease.length) {
    next = semver.inc(next, 'major')
  }
  return next
}

function getAbi (target, runtime) {
  if (target === String(Number(target))) return target
  if (target) target = target.replace(/^v/, '')
  if (!runtime) runtime = 'node'

  if (runtime === 'node') {
    if (!target) return process.versions.modules
    if (target === process.versions.node) return process.versions.modules
  }

  var abi
  var lastTarget

  for (var i = 0; i < allTargets.length; i++) {
    var t = allTargets[i]
    if (t.runtime !== runtime) continue
    if (semver.lte(t.target, target) && (!lastTarget || semver.gte(t.target, lastTarget))) {
      abi = t.abi
      lastTarget = t.target
    }
  }

  if (abi && semver.lt(target, getNextTarget(runtime))) return abi
  throw new Error('Could not detect abi for version ' + target + ' and runtime ' + runtime + '.  Updating "node-abi" might help solve this issue if it is a new release of ' + runtime)
}

function getTarget (abi, runtime) {
  if (abi && abi !== String(Number(abi))) return abi
  if (!runtime) runtime = 'node'

  if (runtime === 'node' && !abi) return process.versions.node

  var match = allTargets
    .filter(function (t) {
      return t.abi === abi && t.runtime === runtime
    })
    .map(function (t) {
      return t.target
    })
  if (match.length) {
    var betaSeparatorIndex = match[0].indexOf("-")
    return betaSeparatorIndex > -1
      ? match[0].substring(0, betaSeparatorIndex)
      : match[0]
  }

  throw new Error('Could not detect target for abi ' + abi + ' and runtime ' + runtime)
}

function sortByTargetFn (a, b) {
  var abiComp = Number(a.abi) - Number(b.abi)
  if (abiComp !== 0) return abiComp
  if (a.target < b.target) return -1
  if (a.target > b.target) return 1
  return 0
}

function loadGeneratedTargets () {
  var registry = require('./abi_registry.json')
  var targets = {
    supported: [],
    additional: [],
    future: []
  }

  registry.forEach(function (item) {
    var target = {
      runtime: item.runtime,
      target: item.target,
      abi: item.abi
    }
    if (item.lts) {
      var startDate = new Date(Date.parse(item.lts[0]))
      var endDate = new Date(Date.parse(item.lts[1]))
      var currentDate = new Date()
      target.lts = startDate < currentDate && currentDate < endDate
    } else {
      target.lts = false
    }

    if (target.runtime === 'node-webkit') {
      targets.additional.push(target)
    } else if (item.future) {
      targets.future.push(target)
    } else {
      targets.supported.push(target)
    }
  })

  targets.supported.sort(sortByTargetFn)
  targets.additional.sort(sortByTargetFn)
  targets.future.sort(sortByTargetFn)

  return targets
}

var generatedTargets = loadGeneratedTargets()

var supportedTargets = [
  {runtime: 'node', target: '5.0.0', abi: '47', lts: false},
  {runtime: 'node', target: '6.0.0', abi: '48', lts: false},
  {runtime: 'node', target: '7.0.0', abi: '51', lts: false},
  {runtime: 'node', target: '8.0.0', abi: '57', lts: false},
  {runtime: 'node', target: '9.0.0', abi: '59', lts: false},
  {runtime: 'node', target: '10.0.0', abi: '64', lts: new Date(2018, 10, 1) < new Date() && new Date() < new Date(2020, 4, 31)},
  {runtime: 'electron', target: '0.36.0', abi: '47', lts: false},
  {runtime: 'electron', target: '1.1.0', abi: '48', lts: false},
  {runtime: 'electron', target: '1.3.0', abi: '49', lts: false},
  {runtime: 'electron', target: '1.4.0', abi: '50', lts: false},
  {runtime: 'electron', target: '1.5.0', abi: '51', lts: false},
  {runtime: 'electron', target: '1.6.0', abi: '53', lts: false},
  {runtime: 'electron', target: '1.7.0', abi: '54', lts: false},
  {runtime: 'electron', target: '1.8.0', abi: '57', lts: false},
  {runtime: 'electron', target: '2.0.0', abi: '57', lts: false},
  {runtime: 'electron', target: '3.0.0', abi: '64', lts: false},
  {runtime: 'electron', target: '4.0.0', abi: '64', lts: false},
  {runtime: 'electron', target: '4.0.4', abi: '69', lts: false}
]

supportedTargets.push.apply(supportedTargets, generatedTargets.supported)

var additionalTargets = [
  {runtime: 'node-webkit', target: '0.13.0', abi: '47', lts: false},
  {runtime: 'node-webkit', target: '0.15.0', abi: '48', lts: false},
  {runtime: 'node-webkit', target: '0.18.3', abi: '51', lts: false},
  {runtime: 'node-webkit', target: '0.23.0', abi: '57', lts: false},
  {runtime: 'node-webkit', target: '0.26.5', abi: '59', lts: false}
]

additionalTargets.push.apply(additionalTargets, generatedTargets.additional)

var deprecatedTargets = [
  {runtime: 'node', target: '0.2.0', abi: '1', lts: false},
  {runtime: 'node', target: '0.9.1', abi: '0x000A', lts: false},
  {runtime: 'node', target: '0.9.9', abi: '0x000B', lts: false},
  {runtime: 'node', target: '0.10.4', abi: '11', lts: false},
  {runtime: 'node', target: '0.11.0', abi: '0x000C', lts: false},
  {runtime: 'node', target: '0.11.8', abi: '13', lts: false},
  {runtime: 'node', target: '0.11.11', abi: '14', lts: false},
  {runtime: 'node', target: '1.0.0', abi: '42', lts: false},
  {runtime: 'node', target: '1.1.0', abi: '43', lts: false},
  {runtime: 'node', target: '2.0.0', abi: '44', lts: false},
  {runtime: 'node', target: '3.0.0', abi: '45', lts: false},
  {runtime: 'node', target: '4.0.0', abi: '46', lts: false},
  {runtime: 'electron', target: '0.30.0', abi: '44', lts: false},
  {runtime: 'electron', target: '0.31.0', abi: '45', lts: false},
  {runtime: 'electron', target: '0.33.0', abi: '46', lts: false}
]

var futureTargets = generatedTargets.future

var allTargets = deprecatedTargets
  .concat(supportedTargets)
  .concat(additionalTargets)
  .concat(futureTargets)

exports.getAbi = getAbi
exports.getTarget = getTarget
exports.deprecatedTargets = deprecatedTargets
exports.supportedTargets = supportedTargets
exports.additionalTargets = additionalTargets
exports.futureTargets = futureTargets
exports.allTargets = allTargets
exports._getNextTarget = getNextTarget

}, function(modId) {var map = {"./abi_registry.json":1779863504334}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1779863504334, function(require, module, exports) {
module.exports = [
  {
    "runtime": "node",
    "target": "11.0.0",
    "lts": false,
    "future": false,
    "abi": "67"
  },
  {
    "runtime": "node",
    "target": "12.0.0",
    "lts": [
      "2019-10-21",
      "2020-11-30"
    ],
    "future": false,
    "abi": "72"
  },
  {
    "runtime": "node",
    "target": "13.0.0",
    "lts": false,
    "future": false,
    "abi": "79"
  },
  {
    "runtime": "node",
    "target": "14.0.0",
    "lts": [
      "2020-10-27",
      "2021-10-19"
    ],
    "future": false,
    "abi": "83"
  },
  {
    "runtime": "node",
    "target": "15.0.0",
    "lts": false,
    "future": false,
    "abi": "88"
  },
  {
    "runtime": "node",
    "target": "16.0.0",
    "lts": [
      "2021-10-26",
      "2022-10-18"
    ],
    "future": false,
    "abi": "93"
  },
  {
    "runtime": "node",
    "target": "17.0.0",
    "lts": false,
    "future": false,
    "abi": "102"
  },
  {
    "runtime": "node",
    "target": "18.0.0",
    "lts": [
      "2022-10-25",
      "2023-10-18"
    ],
    "future": false,
    "abi": "108"
  },
  {
    "runtime": "node",
    "target": "19.0.0",
    "lts": false,
    "future": false,
    "abi": "111"
  },
  {
    "runtime": "node",
    "target": "20.0.0",
    "lts": [
      "2023-10-24",
      "2024-10-22"
    ],
    "future": false,
    "abi": "115"
  },
  {
    "runtime": "node",
    "target": "21.0.0",
    "lts": false,
    "future": false,
    "abi": "120"
  },
  {
    "runtime": "node",
    "target": "22.0.0",
    "lts": [
      "2024-10-29",
      "2025-10-21"
    ],
    "future": false,
    "abi": "127"
  },
  {
    "runtime": "node",
    "target": "23.0.0",
    "lts": false,
    "future": false,
    "abi": "131"
  },
  {
    "runtime": "node",
    "target": "24.0.0",
    "lts": [
      "2025-10-28",
      "2026-10-20"
    ],
    "future": false,
    "abi": "137"
  },
  {
    "runtime": "node",
    "target": "25.0.0",
    "lts": false,
    "future": false,
    "abi": "141"
  },
  {
    "runtime": "node",
    "target": "26.0.0",
    "lts": [
      "2026-10-28",
      "2027-10-20"
    ],
    "future": false,
    "abi": "147"
  },
  {
    "abi": "70",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "5.0.0-beta.9"
  },
  {
    "abi": "73",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "6.0.0-beta.1"
  },
  {
    "abi": "75",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "7.0.0-beta.1"
  },
  {
    "abi": "76",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "9.0.0-beta.1"
  },
  {
    "abi": "76",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "8.0.0-beta.1"
  },
  {
    "abi": "80",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "9.0.0-beta.2"
  },
  {
    "abi": "82",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "11.0.0-beta.1"
  },
  {
    "abi": "82",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "10.0.0-beta.1"
  },
  {
    "abi": "85",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "11.0.0-beta.11"
  },
  {
    "abi": "87",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "12.0.0-beta.1"
  },
  {
    "abi": "89",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "15.0.0-alpha.1"
  },
  {
    "abi": "89",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "14.0.0-beta.1"
  },
  {
    "abi": "89",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "13.0.0-beta.2"
  },
  {
    "abi": "97",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "14.0.2"
  },
  {
    "abi": "98",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "15.0.0-beta.7"
  },
  {
    "abi": "99",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "16.0.0-alpha.1"
  },
  {
    "abi": "101",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "17.0.0-alpha.1"
  },
  {
    "abi": "103",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "18.0.0-alpha.1"
  },
  {
    "abi": "106",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "19.0.0-alpha.1"
  },
  {
    "abi": "107",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "20.0.0-alpha.1"
  },
  {
    "abi": "109",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "21.0.0-alpha.1"
  },
  {
    "abi": "110",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "22.0.0-alpha.1"
  },
  {
    "abi": "113",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "23.0.0-alpha.1"
  },
  {
    "abi": "114",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "24.0.0-alpha.1"
  },
  {
    "abi": "116",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "26.0.0-alpha.1"
  },
  {
    "abi": "116",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "25.0.0-alpha.1"
  },
  {
    "abi": "118",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "27.0.0-alpha.1"
  },
  {
    "abi": "119",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "28.0.0-alpha.1"
  },
  {
    "abi": "121",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "29.0.0-alpha.1"
  },
  {
    "abi": "123",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "31.0.0-alpha.1"
  },
  {
    "abi": "123",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "30.0.0-alpha.1"
  },
  {
    "abi": "125",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "31.0.0-beta.7"
  },
  {
    "abi": "128",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "32.0.0-alpha.1"
  },
  {
    "abi": "130",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "33.0.0-alpha.1"
  },
  {
    "abi": "132",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "34.0.0-alpha.1"
  },
  {
    "abi": "133",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "35.0.0-alpha.1"
  },
  {
    "abi": "135",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "36.0.0-alpha.1"
  },
  {
    "abi": "136",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "37.0.0-alpha.1"
  },
  {
    "abi": "139",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "38.0.0-alpha.1"
  },
  {
    "abi": "140",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "39.0.0-alpha.1"
  },
  {
    "abi": "143",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "40.0.0-alpha.2"
  },
  {
    "abi": "145",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "41.0.0-alpha.1"
  },
  {
    "abi": "146",
    "future": false,
    "lts": false,
    "runtime": "electron",
    "target": "42.0.0-alpha.1"
  },
  {
    "abi": "148",
    "future": true,
    "lts": false,
    "runtime": "electron",
    "target": "43.0.0-alpha.1"
  }
]
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1779863504333);
})()
//miniprogram-npm-outsideDeps=["semver"]
//# sourceMappingURL=index.js.map