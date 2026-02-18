import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoalsProvider } from './contexts/GoalsContext'
import { MissionsProvider } from './contexts/MissionsContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import MyMissions from './pages/MyMissions'
import Goals from './pages/Goals'
import Budget from './pages/Budget'
import Contract from './pages/Contract'
import OpportunityCost from './pages/OpportunityCost'
import Settings from './pages/Settings'

/**
 * App = "מפת הדרכים" של האפליקציה.
 *
 * מה זה Router?
 * במקום שיהיה לנו קובץ HTML אחר לכל עמוד, אנחנו באפליקציית React נשארים באותו דף,
 * ורק מחליפים את התוכן לפי הכתובת (URL) בדפדפן.
 *
 * לדוגמה:
 * - `/` מציג את דף הבית
 * - `/dashboard` מציג את לוח הבקרה
 */
export default function App() {
  return (
    <CurrencyProvider>
    <GoalsProvider>
    <MissionsProvider>
    <BrowserRouter>
      {/* Routes הוא אוסף של כל הכתובות שהאפליקציה יודעת לטפל בהן. */}
      <Routes>
        {/* 
          Route עם element={<Layout />} אומר:
          "לכל המסכים שבתוך הבלוק הזה, קודם תציג את Layout (תפריט/מסגרת),
          ובתוכו תטען את העמוד המתאים."
        */}
        <Route path="/" element={<Layout />}>
          {/* index = העמוד הראשי של הנתיב `/` */}
          <Route index element={<Home />} />
          {/* כל אחד מהנתיבים האלו מציג קומפוננטה של עמוד */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-missions" element={<MyMissions />} />
          <Route path="goals" element={<Goals />} />
          <Route path="budget" element={<Budget />} />
          <Route path="investment" element={<OpportunityCost title="Opportunity Cost" />} />
          <Route path="contract" element={<Contract />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </MissionsProvider>
    </GoalsProvider>
    </CurrencyProvider>
  )
}
