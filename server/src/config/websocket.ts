import { WebSocketServer, WebSocket } from "ws"
import { Server } from "http"
import { redis } from "../config/redis.js"

const clients = new Map<string, Set<WebSocket>>()

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`)
    const taskId = url.searchParams.get("taskId")

    if (!taskId) {
      ws.close(4000, "Missing taskId")
      return
    }

    if (!clients.has(taskId)) clients.set(taskId, new Set())
    clients.get(taskId)!.add(ws)

    ws.on("close", () => {
      clients.get(taskId)?.delete(ws)
      if (clients.get(taskId)?.size === 0) clients.delete(taskId)
    })

    ws.on("error", () => {
      clients.get(taskId)?.delete(ws)
    })
  })

  console.log("[WebSocket] Server initialized on /ws")
}

export function notifyTaskUpdate(taskId: string, data: { status: string; outputFileName?: string; errorMessage?: string }) {
  const sockets = clients.get(taskId)
  if (!sockets || sockets.size === 0) return

  const message = JSON.stringify({ type: "task_update", taskId, ...data })
  sockets.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  })

  if (data.status === "completed" || data.status === "failed") {
    clients.delete(taskId)
  }
}
