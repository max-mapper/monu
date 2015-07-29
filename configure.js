var ipc = require('ipc')
var Ractive = require('ractive')
var page = require('page')
var fs = require('fs')

Ractive.DEBUG = false

// Throw unhandled javascript errors
window.onerror = function errorHandler (message, url, lineNumber) {
  message = message + '\n' + url + ':' + lineNumber
  throwError(message)
}

var templates = {
  configure: fs.readFileSync(__dirname + '/configure.tmpl').toString(),
  detail: fs.readFileSync(__dirname + '/detail.tmpl').toString(),
  about: fs.readFileSync(__dirname + '/about.html').toString()
}

var state = {}

var events = {
  processAction: function (e) {
    var action = e.node.attributes['data-action'].value
    var procNameAttr = e.node.attributes['data-name']
    var data = {task: action}
    if (procNameAttr) data.name = procNameAttr.value
    ipc.send('task', data)
  },

  quit: function () {
    ipc.send('terminate')
  },

  openDir: function () {
    ipc.send('open-dir')
  },

  openLogsDir: function (e) {
    ipc.send('open-logs-dir', e.context.name)
  }
}

ipc.on('got-all', function gotAll (data) {
  data = data.map(function map (d) {
    if (d.uptime) {
      d.classes = 'btn-positive'
      d.message = 'Running'
      return d
    }
    if (d.state === 'dead') {
      d.classes = 'btn-negative'
      d.message = 'Dead'
      return d
    }

    d.message = 'Not Running'
    return d
  })
  var obj = {items: data}
  if (data.length > 0) obj.hasProcesses = true
  state.configure.set(obj)
})

ipc.on('got-one', function gotOne (data) {
  state.detail.set(data)
})

var routes = {
  configure: function configure (ctx, next) {
    ctx.template = templates.configure
    state.configure = render(ctx, {loading: true})
    ipc.send('get-all')
    ipc.once('status', function gotOnce () {
      next()
    })
  },
  detail: function detail (ctx, next) {
    ctx.template = templates.detail
    state.detail = render(ctx, {loading: true})
    ipc.send('get-one', {name: ctx.params.name})
    ipc.once('status', function gotOnce () {
      next()
    })
  },
  about: function about (ctx, next) {
    ctx.template = templates.about
    state.about = render(ctx, {})
  }
}

// set up routes
page('/', routes.configure)
page('/detail/:name', routes.detail)
page('/about', routes.about)

// initialize router
page.start()
page('/')

function render (ctx) {
  var ract = new Ractive({
    el: '#container',
    template: ctx.template,
    data: ctx.data
  })

  ract.on(events)
  return ract
}
