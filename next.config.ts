// Next.js 설정: standalone 모드로 빌드 (Electron 패키징용)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
