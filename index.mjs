import { createServer } from 'node:http'
import WebSocket, { WebSocketServer } from 'ws'

export const isValidPath = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function createSignalingServer ({ ipc }) {
  const http = createServer()
  const wss = new WebSocketServer({ noServer: true })

  ipc?.on('message', ({ path, data, binary }) => {
    wss.clients.forEach(client => {
      if (client.path !== path || client.readyState !== WebSocket.OPEN) return
      client.send(data, { binary })
    })
  })

  wss.on('connection', function connection (ws, req) {
    ws.on('message', (data, binary) => {
      ipc?.send({ path: ws.path, data, binary })
      wss.clients.forEach(client => {
        if (client === ws || client.path !== ws.path || client.readyState !== WebSocket.OPEN) return
        client.send(data, { binary })
      })
    })
  })

  http.on('upgrade', (req, socket, head) => {
    if (isValidPath.test(req.url)) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.path = req.url // cannot use ws.url as of https://github.com/websockets/ws/blob/master/lib/websocket.js#L188-L190
        wss.emit('connection', ws, req)
      })
    } else {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
    }
  })

  const interval = setInterval(() => {
    wss.clients.forEach(client => {
      if (client.alive === false) return client.terminate()
      client.alive = false
      client.ping()
    })
  }, 30000)

  wss.on('close', () => {
    clearInterval(interval) // would this garbage collected anyway?
  })

  http.on('close', () => {
    wss.close() // is this actually needed?
  })

  return http
}
