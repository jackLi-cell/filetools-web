import { Queue, Worker } from "bullmq"
import { redis } from "./redis.js"

export const processQueue = new Queue("file-process", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
})

export function createWorker(processor: (job: any) => Promise<any>) {
  return new Worker("file-process", processor, {
    connection: redis,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },
  })
}
