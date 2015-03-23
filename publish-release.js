var path = require('path')
var editor = require('string-editor')
var Github = require('github')
var argv = require('minimist')(process.argv.slice(2))

if (!argv.token) {
  console.error('ERROR: An auth token is required to publish a release.')
  process.exit(1)
}

var gh = new Github({
  version: '3.0.0'
})
gh.authenticate({
  type: 'oauth',
  token: argv.token
})

var noteTemplate = 'Replace with release notes\n\nOn first launch you will probably have to **Right Click > Open** Monu.app in order to bypass the Mac OS warning.'

editor(noteTemplate, 'notes.md', function (err, notes) {
  if (err) throw err

  console.log('Creating release...')
  gh.releases.createRelease({
    owner: 'maxogden',
    repo: 'monu',
    tag_name: argv.tag,
    name: 'Monu ' + argv.tag + ' Alpha',
    body: notes
  }, function (err, release) {
    if (err) throw err

    console.log('Uploading Monu... this may take a minute')
    gh.releases.uploadAsset({
      owner: 'maxogden',
      repo: 'monu',
      id: release.id,
      name: 'Monu.zip',
      filePath: path.resolve(__dirname, './Monu.zip')
    }, function (err, asset) {
      if (err) throw err

      console.log('Done! Published at: ' + release.html_url)
    })
  })
})
