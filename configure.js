var Ractive = require('ractive')
var page = require('page')
var fs = require('fs')
var Client = require('electron-rpc/client')
var client = new Client()

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
    client.request('task', data, function (err, data) {
      if (err) return throwError(err)
      if (!data) return

      if (Array.isArray(data)) {
        renderAll(data)
      } else if (data.name) {
        state.detail.set(data)
      }
    })
  },

  quit: function () {
    client.request('terminate')
  },

  openDir: function () {
    client.request('open-dir')
  },

  openLogsDir: function (e) {
    client.request('open-logs-dir', {name: e.context.name})
  }
}

var routes = {
  configure: function configure (ctx, next) {
    ctx.template = templates.configure
    state.configure = render(ctx, {loading: true})
    getAndRenderAll(next)
  },
  detail: function detail (ctx, next) {
    ctx.template = templates.detail
    state.detail = render(ctx, {loading: true})
    getAndRender(ctx.params.name, next)
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

// Load all statuses when the app gets focused
client.on('show', function () {
  getAndRenderAll()
  var currentProcess = state.detail && state.detail.get('name')
  if (currentProcess) getAndRender(currentProcess)
})

function render (ctx) {
  var ract = new Ractive({
    el: '#container',
    template: ctx.template,
    data: ctx.data
  })

  ract.on(events)
  return ract
}

function getAndRenderAll (callback) {
  callback = catchErrors(callback || function () {})
  client.request('get-all', function (err, data) {
    if (err) return callback(err)
    renderAll(data)
    callback()
  })
}

function renderAll (data) {
  data = data || []
  var obj = {items: data, hasProcesses: data.length > 0}
  state.configure.set(obj)
}

function getAndRender (name, callback) {
  callback = catchErrors(callback || function () {})
  client.request('get-one', {name: name}, function (err, data) {
    if (err) return callback(err)
    state.detail.set(data)
    callback()
  })
}

function catchErrors (callback) {
  return function throwErrorsOrContinue (err) {
    if (err) return throwError(err)
    callback()
  }
}

function throwError (error) {
  var message = error.stack || error.message || JSON.stringify(error)
  console.error(message)
  window.alert(message)
}
