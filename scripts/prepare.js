// 빌드 전처리: .next/static과 public을 standalone 폴더에 복사
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

const standalone = path.join(root, '.next', 'standalone')
if (!fs.existsSync(standalone)) {
  console.error('ERROR: .next/standalone 없음. npm run build:next 먼저 실행하세요.')
  process.exit(1)
}

// .next/static → .next/standalone/.next/static
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static')
)

// public → .next/standalone/public
copyDir(
  path.join(root, 'public'),
  path.join(standalone, 'public')
)

console.log('준비 완료: standalone 폴더에 static + public 복사됨')
