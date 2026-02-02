import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// קובץ הגדרות של Vite (כלי הבנייה/פיתוח שמריץ את הפרויקט).
// פה אנחנו אומרים ל-Vite להשתמש בתוספים של React ושל Tailwind.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
