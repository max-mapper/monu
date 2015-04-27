var path = require('path')
var fs = require('fs')

var menubar = require('menubar')
var ms = require('ms')
var Mongroup = require('mongroup')
var mkdir = require('mkdirp').sync
var debug = require('debug')('monu')

var ipc = require('ipc')
var shell = require('shell')

// fix the $PATH on OS X
require('fix-path')()

var opts = {
  dir: __dirname,
  icon: path.join(__dirname, 'images', 'Icon.png')
}

var menu = menubar(opts)

menu.on('ready', function ready () {
  var canQuit = false
  menu.app.on('will-quit', function tryQuit (e) {
    if (canQuit) return true
    menu.window = undefined
    e.preventDefault()
  })

  var conf = loadConfig()

  // start all once
  start([], function started (err) {
    if (err) return console.log('error starting processes: ' + err.message)
    console.log('started all processes')
  })

  menu.on('show', function show () {
    getStatus()
  })

  ipc.on('terminate', function terminate (ev) {
    canQuit = true
    menu.app.terminate()
  })

  ipc.on('open-dir', function openDir (ev) {
    shell.showItemInFolder(path.join(conf.exec.cwd, 'config.json'))
  })

  ipc.on('open-logs-dir', function openLogsDir (ev, name) {
    shell.showItemInFolder(path.join(conf.logs, name + '.log'))
  })

  ipc.on('get-all', function getAll (ev, data) {
    getStatus()
  })

  ipc.on('get-one', function getOne (ev, data) {
    getStatus(null, data.name)
  })

  ipc.on('task', function task (ev, data) {
    if (data.task === 'startAll') start([], getStatus)
    if (data.task === 'stopAll') stop([], getStatus)
    if (data.task === 'restartAll') restart([], getStatus)
    if (data.task === 'start') start([data.name], updateSingle)
    if (data.task === 'stop') stop([data.name], updateSingle)
    if (data.task === 'restart') restart([data.name], updateSingle)

    function updateSingle () {
      getStatus(null, data.name)
    }
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

  function getStatus (err, procName) {
    if (err) throw err
    if (!menu.window) return
    debug('reload config, get proc status...')
    conf = loadConfig()
    var status = []
    var group = new Mongroup(conf)
    var procs = group.procs
    if (procName) {
      procs = procs.filter(function filter (proc) {
        return proc.name === procName
      })
    }
    procs.forEach(function each (proc) {
      var state = proc.state()
      var uptime
      if (state === 'alive') uptime = ms(Date.now() - proc.mtime(), { long: true })
      var item = {
        cmd: proc.cmd,
        name: proc.name,
        state: state,
        pid: proc.pid
      }

      if (uptime) item.uptime = uptime

      status.push(item)
    })

    if (procName) menu.window.webContents.send('got-one', status[0])
    else menu.window.webContents.send('got-all', status)
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
      if (cb) return cb(err)
      cb()
    })
  }
})
