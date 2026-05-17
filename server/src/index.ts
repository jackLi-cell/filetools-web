import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { env } from "./config/env.js"
import { errorHandler } from "./middleware/error-handler.js"
import { globalLimiter } from "./middleware/rate-limit.js"
import healthRouter from "./routes/health.js"
import toolsRouter from "./routes/tools.js"
import processRouter from "./routes/process.js"
import authRouter from "./routes/auth.js"
import accountRouter from "./routes/account.js"
import adminRouter from "./routes/admin.js"
import adminAiRouter from "./routes/admin/ai.js"
import paymentRouter from "./routes/payment.js"
import userFeaturesRouter from "./routes/user-features.js"
import aiRouter from "./routes/ai.js"

const app = express()

app.set("trust proxy", 1)

app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())
app.use(globalLimiter)

app.use("/api", healthRouter)
app.use("/api/auth", authRouter)
app.use("/api/account", accountRouter)
app.use("/api/admin/ai", adminAiRouter)
app.use("/api/admin", adminRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/user", userFeaturesRouter)
app.use("/api/tools", toolsRouter)
app.use("/api/process", processRouter)
app.use("/api/ai", aiRouter)

app.use(errorHandler)

app.listen(env.port, env.host, () => {
  console.log(`[Server] Running on ${env.host}:${env.port} (${env.nodeEnv})`)
})

export default app
