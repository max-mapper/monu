var path = require('path')

var app = require('app')
var Menu = require('menu')
var Tray = require('tray')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')

var ms = require('ms')
var Mongroup = require('mongroup')
var fs = require('fs')
var mkdir = require('mkdirp').sync
var debug = require('debug')('monu')

var icon, menu, configure, about

app.on('ready', function() {
  app.dock.hide()
  
  app.on('will-quit', function(e) {
    configure = undefined
    e.preventDefault()
  })
  
  // main.js
  var template = []

  var iconPath = path.join(__dirname, 'images', 'Status.png')
  var configFile = './test/config.json'
  var conf = require(configFile)
  var dir = path.dirname(configFile)
  conf.exec = {cwd: path.resolve(dir)}
  conf.logs = path.resolve(path.join(dir, conf.logs || 'logs'))
  conf.pids = path.resolve(path.join(dir, conf.pids || 'pids'))
  mkdir(conf.logs)
  mkdir(conf.pids)
  
  conf.mon = path.join(__dirname, 'mon')
  icon = new Tray(iconPath)

  var menuTemplate = [
    {
      label: 'Configure...',
      click: function() {
        showConfigure()
      }
    },
    { 
      type: 'separator'
    },
    {
      label: 'About',
      click: function() {
        showAbout()
      }
    },
    {
      label: 'Quit',
      click: function() {
        app.terminate()
      }
    }
  ]
  
  showConfigure()
  
  menu = Menu.buildFromTemplate(menuTemplate)  
  icon.setContextMenu(menu)
  
  ipc.on('update-me', updateStatus)
  ipc.on('task', function task (ev, data) {
    if (data.task === "startAll") startAll(updateStatus)
    if (data.task === "stopAll") stopAll(updateStatus)
    if (data.task === "restartAll") restartAll(updateStatus)
  }) 
  
  function showConfigure() {
    if (configure) return configure.show( )
    configure = new BrowserWindow({
      width: 400,
      height: 400,
      show: true
    })
    configure.loadUrl('file://' + __dirname + '/configure.html')
  }
  
  function updateStatus() {
    if (!configure) return
    debug('update status...')
    var status = []
    var group = new Mongroup(conf)
    group.procs.forEach(function(proc) {
      var state = proc.state()
      var uptime
      if (state === 'alive') uptime = ms(Date.now() - proc.mtime(), { long: true })

      var item = {
        name: proc.name,
        state: state,
        pid: proc.pid
      }

      if (uptime) item.uptime = uptime

      status.push(item)
    })
    
    configure.webContents.send('status', status)
  }
  
  function restartAll(cb) {
    stopAll(function (err1) {
      startAll(function (err2) {
        if (cb) cb(err1 || err2)
      })
    })
  }
  
  function startAll(cb) {
    var group = new Mongroup(conf)
    group.start([], function (err) {
      if (err) return cb(err)
      cb()
    })
  }

  function stopAll(cb) {
    var group = new Mongroup(conf)
    group.stop([], 'SIGQUIT', function (err) {
      if (cb) return cb(err)
      cb()
    })
  }
})