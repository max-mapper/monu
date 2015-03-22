var path = require('path')
var child = require('child_process')

var app = require('app')
var Menu = require('menu')
var Tray = require('tray')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')
var shell = require('shell')

var ms = require('ms')
var Mongroup = require('mongroup')
var fs = require('fs')
var mkdir = require('mkdirp').sync
var debug = require('debug')('monu')

var icon, menu, configure, about

// launching from .app doesnt use bash and never loads .e.g. .bash_profile
process.env.PATH = '/usr/local/bin:' + process.env.PATH

app.on('ready', function() {
  app.dock.hide()
  var atomScreen = require('screen')
  var size = atomScreen.getPrimaryDisplay()

  var canQuit = false
  app.on('will-quit', function(e) {
    if (canQuit) return true
    configure = undefined
    e.preventDefault()
  })
  
  var conf = loadConfig()
  
  // start all once
  start([], function started (err) {
    if (err) return console.log("error starting processes: " + err.message)
    console.log("started all processes")
  })

  var iconPath = path.join(__dirname, 'images', 'Icon.png')
  icon = new Tray(iconPath)
  
  icon.on('clicked', function(e) {
    if (configure && configure.isVisible()) return hideConfigure()
    showConfigure()
  })

  ipc.on('terminate', function terminate (ev) {
    canQuit = true
    app.terminate()
  })
  
  ipc.on('open-dir', function openDir (ev) {
    shell.showItemInFolder(path.join(conf.exec.cwd, 'config.json'))
  })
  
  ipc.on('get-all', function getAll (ev, data) {
    getStatus()
  })
  
  ipc.on('get-one', function getOne (ev, data) {
    getStatus(null, data.name)
  })
  
  ipc.on('task', function task (ev, data) {
    if (data.task === "startAll") start([], getStatus)
    if (data.task === "stopAll") stop([], getStatus)
    if (data.task === "restartAll") restart([], getStatus)
    if (data.task === "start") start([data.name], updateSingle)
    if (data.task === "stop") stop([data.name], updateSingle)
    if (data.task === "restart") restart([data.name], updateSingle)
      
    function updateSingle() {
      getStatus(null, data.name)
    }
  }) 
  
  function loadConfig() {
    var dir = path.join(app.getPath('userData'), 'data')
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
  
  function showConfigure() {
    if (configure) {
      getStatus()
      return configure.show()
    }
    configure = new BrowserWindow({
      width: 400,
      height: 400,
      show: true,
      frame: false
    })
    configure.setPosition(size.workArea.width - 600, size.workArea.y)
    configure.on('blur', hideConfigure)
    configure.loadUrl('file://' + __dirname + '/index.html')
  }
  
  function hideConfigure() {
    if (configure) return configure.hide()
  }
  
  function getStatus(err, procName) {
    if (err) throw err
    if (!configure) return
    debug('reload config, get proc status...')
    conf = loadConfig()
    var status = []
    var group = new Mongroup(conf)
    var procs = group.procs
    if (procName) procs = procs.filter(function filter (proc) {
      return proc.name === procName
    })
    procs.forEach(function(proc) {
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
    
    if (procName) configure.webContents.send('got-one', status[0])
    else configure.webContents.send('got-all', status)
  }
  
  function restart(procs, cb) {
    stop(procs, function (err1) {
      start(procs, function (err2) {
        if (cb) cb(err1 || err2)
      })
    })
  }
  
  function start(procs, cb) {
    var group = new Mongroup(conf)
    group.start(procs, function (err) {
      if (err) return cb(err)
      cb()
    })
  }

  function stop(procs, cb) {
    var group = new Mongroup(conf)
    group.stop(procs, 'SIGQUIT', function (err) {
      if (cb) return cb(err)
      cb()
    })
  }
})