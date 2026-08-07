import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Lightning CSS của Vite 8 lỗi khi minify stylesheet animation cũ của dự án.
    // Chỉ tắt minify CSS; JavaScript vẫn được tối ưu bình thường.
    cssMinify: false,
  },
  server: {
    open: true, 
    port: 5173  
  },
});
