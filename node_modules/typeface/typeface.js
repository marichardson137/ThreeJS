#!/usr/local/bin/node
var fs = require('fs')
var keypress = require('keypress')
var filename = process.argv[2] || ''

fs.readFile(filename, 'utf8', init)
function init(err, data) {
  if(err) throw err;
  var pos = 0
  var length = 1

  keypress(process.stdin)
  process.stdin.on('keypress', onKeypress)
  function onKeypress(ch, key) {
    if(key && key.ctrl && key.name === 'c')
      process.exit()
    if(key && key.ctrl && key.name === 'w')
      process.stdout.write('\nFile \''+filename+'\' saved!')
    if(!isNaN(parseInt(ch)))
      length = Math.pow(2, parseInt(ch))
    else {
      process.stdout.write(data.substr(pos, length))
      pos = pos + length
    }
  }

  process.stdin.setRawMode(true)
  process.stdin.resume()
}
