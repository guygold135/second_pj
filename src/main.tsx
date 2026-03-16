import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-day-picker/style.css'
import './index.css'
import App from './App.tsx'

// נקודת הכניסה של האפליקציה:
// כאן אנחנו "מחברים" את React לתוך האלמנט <div id="root"></div> שנמצא ב-`index.html`.
// מרגע זה React שולט על מה שרואים על המסך בתוך ה-root.
createRoot(document.getElementById('root')!).render(
  // StrictMode הוא מצב פיתוח שמנסה לעזור לנו למצוא בעיות מוקדם.
  // הוא לא חלק מה-UI עצמו, אלא עטיפה "מאחורי הקלעים" למפתחים.
  <StrictMode>
    {/* App הוא הרכיב הראשי שמכיל את הראוטינג (לאיזה עמוד הולכים בכל כתובת). */}
    <App />
  </StrictMode>,
)
