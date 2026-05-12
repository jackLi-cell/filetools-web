/** @type {import('next').NextConfig} */
const nextConfig = {}

if (process.env.NODE_ENV === "development") {
  try {
    const { setupDevPlatform } = await import("@cloudflare/next-on-pages/next-dev")
    await setupDevPlatform()
  } catch {}
}

export default nextConfig
