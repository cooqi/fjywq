const fs = require('fs')
const src = fs.readFileSync('pages/game/new2048/new2048.vue', 'utf8')
const m = src.match(/<script>([\s\S]*?)<\/script>/)
if (!m) { console.error('no script block'); process.exit(1) }
fs.writeFileSync('pages/game/new2048/_chk.mjs', m[1])
console.log('extracted', m[1].length, 'chars')
