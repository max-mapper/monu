var path = require('path')

var app = require('app')
var Menu = require('menu')
var Tray = require('tray')

var ms = require('ms')
var Mongroup = require('mongroup')
var fs = require('fs')
var mkdir = require('mkdirp').sync

var icon, menu

app.on('ready', function() {
  // main.js
  var template = []

  var iconPath = path.join(__dirname, 'images', 'Status.png')
  var configFile = './test/config.json'
  var conf = require(configFile)
  var dir = path.dirname(configFile)
  process.chdir(dir)
  mkdir(conf.logs || 'logs')
  mkdir(conf.pids || 'pids')
  
  conf.mon = path.join(__dirname, 'mon')
  
  var group = new Mongroup(conf)
  

  icon = new Tray(iconPath)
  group.procs.forEach(function(proc) {
    var state = proc.state()

    var uptime
    if (state === 'alive') uptime = ms(Date.now() - proc.mtime(), { long: true })

    var item = {
      label: proc.name,
      submenu: [
        {label: "State: " + state},
        {label: "PID: " + proc.pid}
      ]
    }

    if (uptime) item.submenu.push({label: "Uptime: " + uptime})

    template.push(item)
  })

  template.push({
    type: 'separator'
  }, {
    label: 'Actions',
    submenu: [{
      label: 'Restart All',
      click: function() {
        restartAll(function (err) {
          if (err) throw err
        })
      }
    }, {
      label: 'Stop All',
      click: function() {
        stopAll(function (err) {
          if (err) throw err
        })
      }
    }]
  })

  menu = Menu.buildFromTemplate(template)  
  icon.setContextMenu(menu)
    
  function restartAll(cb) {
    stopAll(function (err1) {
      startAll(function (err2) {
        if (cb) cb(err1 || err2)
      })
    })
  }
  
  function startAll(cb) {
    group.start(Object.keys(conf.processes), function (err) {
      if (err) return cb(err)
      cb()
    })
  }

  function stopAll(cb) {
    group.stop(Object.keys(conf.processes), 'SIGQUIT', function (err) {
      if (cb) return cb(err)
      cb()
    })
  }
})