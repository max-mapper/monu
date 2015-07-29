var path = require('path')
var fs = require('fs')

var menubar = require('menubar')
var ms = require('ms')
var Mongroup = require('mongroup')
var mkdir = require('mkdirp').sync
var debug = require('debug')('monu')
var shell = require('shell')

// fix the $PATH on OS X
require('fix-path')()

var Server = require('electron-rpc/server')
var app = new Server()

var opts = {dir: __dirname, icon: path.join(__dirname, 'images', 'Icon.png')}
var menu = menubar(opts)
var conf = loadConfig()
menu.on('ready', function ready () {

  var canQuit = false
  menu.app.on('will-quit', function tryQuit (e) {
    if (canQuit) return true
    menu.window = undefined
    e.preventDefault()
  })

  // start all once
  start([], function started (err) {
    if (err) return console.log('error starting processes: ' + err.message)
    console.log('started all processes')
  })

  menu.on('show', function show () {
    app.configure(menu.window.webContents)
    app.send('show')
  })

  app.on('terminate', function terminate (ev) {
    canQuit = true
    menu.app.terminate()
  })

  app.on('open-dir', function openDir (ev) {
    shell.showItemInFolder(path.join(conf.exec.cwd, 'config.json'))
  })

  app.on('open-logs-dir', function openLogsDir (req) {
    shell.showItemInFolder(path.join(conf.logs, req.body.name + '.log'))
  })

  app.on('get-all', function getAll (req, next) {
    next(null, getProcessesStatus())
  })

  app.on('get-one', function getOne (req, next) {
    next(null, getProcessStatus(req.body.name))
  })

  app.on('task', function task (req, next) {
    if (req.body.task === 'startAll') start([], updateAll)
    if (req.body.task === 'stopAll') stop([], updateAll)
    if (req.body.task === 'restartAll') restart([], updateAll)
    if (req.body.task === 'start') start([req.body.name], updateSingle)
    if (req.body.task === 'stop') stop([req.body.name], updateSingle)
    if (req.body.task === 'restart') restart([req.body.name], updateSingle)

    function updateAll (err) {
      if (err) throw err
      next(null, getProcessesStatus())
    }

    function updateSingle (err) {
      if (err) throw err
      next(null, getProcessStatus(req.body.name))
    }
  })
})



function loadConfig () {
  var dir = path.join(menu.app.getPath('userData'), 'data')
  var configFile = dir + '/config.json'
  var conf, data

  try {
    data = fs.readFileSync(configFile)
  } catch (e) {
    if (e.code === 'ENOENT') {
      mkdir(dir)
      fs.writeFileSync(configFile, fs.readFileSync(__dirname + '/config.json'))
      return loadConfig()
    } else {
      throw e
    }
  }

  try {
    conf = JSON.parse(data.toString())
  } catch (e) {
    throw new Error('Invalid configuration file -- could not parse JSON')
  }

  conf.exec = {cwd: dir}
  conf.logs = path.resolve(path.join(dir, conf.logs || 'logs'))
  conf.pids = path.resolve(path.join(dir, conf.pids || 'pids'))

  mkdir(conf.logs)
  mkdir(conf.pids)

  conf.mon = path.join(__dirname, 'mon')
  return conf
}

function getProcessStatus (procName) {
  var procs = getProcessesStatus()
  return procs.filter(function filter (proc) {
    return proc.name === procName
  })[0]
}

function getProcessesStatus () {
  debug('reload config, get proc status...')
  conf = loadConfig()
  var group = new Mongroup(conf)
  var procs = group.procs

  return procs.map(function each (proc) {
    var uptime, state = proc.state()
    if (state === 'alive') uptime = ms(Date.now() - proc.mtime(), { long: true })
    var item = {
      cmd: proc.cmd,
      name: proc.name,
      state: state,
      pid: proc.pid,
      uptime: uptime ? uptime : undefined
    }

    return item
  })
}

function restart (procs, cb) {
  stop(procs, function onstop (err1) {
    start(procs, function onstart (err2) {
      if (cb) cb(err1 || err2)
    })
  })
}

function start (procs, cb) {
  var group = new Mongroup(conf)
  group.start(procs, function onstart (err) {
    if (err) return cb(err)
    cb()
  })
}

function stop (procs, cb) {
  var group = new Mongroup(conf)
  group.stop(procs, 'SIGQUIT', function onstop (err) {
    if (!err || err.code === 'ENOENT') return cb()
    cb(err)
  })
}
