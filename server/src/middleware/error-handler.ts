import { Request, Response, NextFunction } from "express"

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message)

  if (err.name === "ZodError") {
    res.status(400).json({ code: 400, message: "参数校验失败", errors: JSON.parse(err.message) })
    return
  }

  if (err.message === "UNAUTHORIZED") {
    res.status(401).json({ code: 401, message: "请先登录" })
    return
  }

  if (err.message === "FORBIDDEN") {
    res.status(403).json({ code: 403, message: "无权限访问" })
    return
  }

  res.status(500).json({ code: 500, message: "服务器内部错误" })
}
