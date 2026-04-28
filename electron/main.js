// Electron 메인 프로세스: 앱 창 생성 및 Next.js 서버 기동 관리
const { app, BrowserWindow, session } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

const PORT = 3141
const isDev = !app.isPackaged

let mainWindow
let serverProcess

function waitForServer(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      http.get(`http://127.0.0.1:${port}`, resolve).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('서버 시작 시간 초과'))
        } else {
          setTimeout(check, 500)
        }
      })
    }
    check()
  })
}

async function startServer() {
  if (isDev) {
    // 개발 모드: next dev 실행
    const cwd = path.join(__dirname, '..')
    serverProcess = spawn('node', ['node_modules/.bin/next', 'dev', '-p', String(PORT)], {
      cwd,
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' },
    })
  } else {
    // 프로덕션 모드: standalone server.js 실행
    const serverScript = path.join(process.resourcesPath, 'standalone', 'server.js')
    serverProcess = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
      },
    })
  }

  serverProcess.stdout?.on('data', d => process.stdout.write('[Server] ' + d))
  serverProcess.stderr?.on('data', d => process.stderr.write('[Server] ' + d))

  await waitForServer(PORT)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 780,
    minWidth: 360,
    minHeight: 600,
    title: '체크리스트',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.setMenuBarVisibility(false)

  try {
    await startServer()
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
  } catch (err) {
    mainWindow.loadURL(
      `data:text/html,<h2>서버 시작 실패</h2><pre>${err}</pre>`
    )
  }
}

app.whenReady().then(async () => {
  await session.defaultSession.clearCache()
  createWindow()
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  app.quit()
})
