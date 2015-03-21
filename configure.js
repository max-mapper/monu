var ipc = require('ipc')
var Ractive = require('ractive')
var page = require('page')
var fs = require('fs')
var $ = require('jquery')

Ractive.DEBUG = false

var templates = {
  configure: fs.readFileSync('./configure.tmpl').toString(),
  detail: fs.readFileSync('./detail.tmpl').toString(),
  about: fs.readFileSync('./about.html').toString()
}

var state = {}

$(document).on('click', '.processAction', function(e) {
  var action = e.currentTarget.attributes['data-action'].value
  var procNameAttr = e.currentTarget.attributes['data-name']
  var data = {task: action}
  if (procNameAttr) data.name = procNameAttr.value
  ipc.send('task', data)
})

$(document).on('click', '.btn.quit', function(e) {
  ipc.send('terminate')
})

$(document).on('click', '.btn.open-dir', function(e) {
  ipc.send('open-dir')
})

ipc.on('got-all', function gotAll (data) {
  data = data.map(function map (d) {
    if (d.uptime) {
      d.classes = "btn-positive"
      d.message = "Running"
      return d
    }
    if (d.state === 'dead') {
      d.classes = "btn-negative"
      d.message = "Dead"
      return d
    }
    
    d.message = "Not Running"
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
  configure: function(ctx, next) {
    ctx.template = templates.configure
    state.configure = render(ctx, {loading: true})
    ipc.send('get-all')
    ipc.once('status', function() {
      next()
    })
  },
  detail: function(ctx, next) {
    ctx.template = templates.detail
    state.detail = render(ctx, {loading: true})
    ipc.send('get-one', {name: ctx.params.name})
    ipc.once('status', function() {
      next()
    })
  },
  about: function(ctx, next) {
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

function render(ctx) {
  return new Ractive({
    el: "#container",
    template: ctx.template,
    data: ctx.data
  })
}
