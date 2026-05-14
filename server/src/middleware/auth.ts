import { Request, Response, NextFunction } from "express"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token
  if (!token) {
    res.status(401).json({ code: 401, message: "请先登录" })
    return
  }

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, role: true, status: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: token } })
    res.status(401).json({ code: 401, message: "登录已过期，请重新登录" })
    return
  }

  if (session.user.status === "banned") {
    res.status(403).json({ code: 403, message: "账号已被封禁" })
    return
  }

  ;(req as any).userId = session.user.id
  ;(req as any).userRole = session.user.role
  next()
}

/**
 * 软鉴权：读取 session 但不强制登录。已登录则填充 userId/userRole，未登录则跳过。
 * 用于 AI 路由这类既允许匿名又允许登录的场景。
 */
export async function softAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.session_token
  if (!token) {
    next()
    return
  }
  try {
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: { select: { id: true, role: true, status: true } } },
    })
    if (!session || session.expiresAt < new Date()) {
      next()
      return
    }
    if (session.user.status === "banned") {
      // 被封号的用户当作匿名处理（避免占用登录额度），但不阻塞
      next()
      return
    }
    ;(req as any).userId = session.user.id
    ;(req as any).userRole = session.user.role
  } catch (err) {
    // 软鉴权失败时默默退化为匿名
    console.warn("[softAuth] session lookup failed:", err)
  }
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if ((req as any).userRole !== "admin") {
      res.status(403).json({ code: 403, message: "无管理员权限" })
      return
    }
    next()
  })
}
