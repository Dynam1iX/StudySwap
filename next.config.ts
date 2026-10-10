import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Разрешаем подключения по локальной сети с телефона и других устройств
  allowedDevOrigins: ["10.201.2.227", "10.201.2.227:3000", "localhost:3000"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;