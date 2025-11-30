import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { GameLogger } from './src/lib/GameLogger'

// 自定义插件：提供游戏日志API
function gameLogApiPlugin(): Plugin {
  return {
    name: 'game-log-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // POST /api/game-logs - 保存游戏日志
        if (req.url === '/api/game-logs' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const gameLog = JSON.parse(body)
              GameLogger.saveLog(gameLog)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (error) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Failed to save game log' }))
            }
          })
          return
        }

        // GET /api/game-logs - 获取所有游戏日志摘要
        if (req.url === '/api/game-logs' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          const summaries = GameLogger.getAllLogSummaries()
          res.end(JSON.stringify(summaries))
          return
        }

        // 获取单个游戏日志详情
        const matchDetail = req.url?.match(/^\/api\/game-logs\/(.+)$/)
        if (matchDetail && req.method === 'GET') {
          const gameId = matchDetail[1]
          res.setHeader('Content-Type', 'application/json')
          const log = GameLogger.loadLog(gameId)
          if (log) {
            res.end(JSON.stringify(log))
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Game log not found' }))
          }
          return
        }

        // 删除游戏日志
        const matchDelete = req.url?.match(/^\/api\/game-logs\/(.+)\/delete$/)
        if (matchDelete && req.method === 'DELETE') {
          const gameId = matchDelete[1]
          res.setHeader('Content-Type', 'application/json')
          const success = GameLogger.deleteLog(gameId)
          res.end(JSON.stringify({ success }))
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/werewolf/',
  plugins: [react(), tailwindcss(), gameLogApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 监听所有网卡，允许外部访问
    port: 3000,
  },
})
