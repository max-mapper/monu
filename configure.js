var ipc = require('ipc')
var mustache = require('mustache')
var fs = require('fs')

var template = fs.readFileSync('./configure.mustache').toString()
var container = document.querySelector('.app')

ipc.on('status', function(data) {
  data = data.map(function(d) {
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
  var output = mustache.render(template, {items: data})
  container.innerHTML = output
  
  addEvents()
})

ipc.send('update-me')

function addEvents() {
  var startAll = document.querySelector('.start-all')
  var stopAll = document.querySelector('.stop-all')
  var restartAll = document.querySelector('.restart-all')
  var buttons = [startAll, stopAll, restartAll]

  buttons.forEach(function (button) {
    button.addEventListener('mousedown', function(e) {
      var action = e.target.attributes['data-action'].value
      ipc.send('task', {task: action})
    })
  })
}