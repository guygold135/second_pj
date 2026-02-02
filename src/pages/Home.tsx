import { useState, type FormEvent } from 'react'
import type { Task } from '../types'

// נתוני דוגמה למשימות שמוצגות בדף הבית.
// חשוב: בפרויקט הזה אין כרגע שרת/דאטה-בייס, אז הכל נשמר רק בזיכרון של הדפדפן.
const initialTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Complete Q1 Marketing Strategy',
    category: 'Marketing',
    dueDate: '24/07',
    progress: 75,
    statusColor: 'red-orange',
    assignee: { name: 'A' },
    isHighPriority: true,
    isCompleted: false,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-002',
    title: 'Launch New Product Feature',
    category: 'Product',
    dueDate: '15/08',
    progress: 50,
    statusColor: 'orange',
    assignee: { name: 'A' },
    isHighPriority: true,
    isCompleted: false,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-003',
    title: 'Team Onboarding Documentation',
    category: 'HR',
    dueDate: '01/07',
    progress: 100,
    statusColor: 'yellow-green',
    assignee: { name: 'A' },
    isHighPriority: true,
    isCompleted: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'task-004',
    title: 'Client Presentation Prep',
    category: 'Sales',
    dueDate: '10/09',
    progress: 80,
    statusColor: 'green',
    assignee: { name: 'A' },
    isHighPriority: true,
    isCompleted: false,
    createdAt: '',
    updatedAt: '',
  },
]

// מיפוי "מצב צבע" -> איזו מחלקת CSS של Tailwind לתת למסגרת העליונה של הכרטיס.
// הרעיון: לכל משימה יכול להיות צבע שמרמז על מצב/דחיפות.
const statusBorder: Record<Task['statusColor'], string> = {
  'red-orange': 'border-t-orange-500',
  orange: 'border-t-amber-500',
  'yellow-green': 'border-t-lime-500',
  green: 'border-t-emerald-500',
}

// מיפוי "מצב צבע" -> איזה צבע למלא את פס ההתקדמות.
const statusBarFill: Record<Task['statusColor'], string> = {
  'red-orange': 'bg-orange-500',
  orange: 'bg-amber-500',
  'yellow-green': 'bg-lime-500',
  green: 'bg-emerald-500',
}

// מצב התחלתי לטופס יצירת משימה חדשה (המודאל).
const defaultFormState = {
  title: '',
  category: 'General',
  dueDate: '',
  notes: '',
}

/**
 * Home = דף הנחיתה (Landing Page) של האפליקציה.
 *
 * מה רואים פה?
 * - אזור פתיחה "שיווקי" (Hero)
 * - רשימת משימות לדוגמה + אפשרות להוסיף משימה (במודאל)
 * - אזור פיצ'רים / המלצות / קריאה לפעולה / פוטר
 *
 * מבחינת לוגיקה: יש פה state מקומי שמחזיק את רשימת המשימות ואת הטופס.
 */
export default function Home() {
  // tasks: הרשימה שמוצגת במסך (נמצאת בזיכרון של הדף)
  const [tasks, setTasks] = useState(initialTasks)
  // formState: מה שהמשתמש כתב בשדות של הטופס
  const [formState, setFormState] = useState(defaultFormState)
  // isFormOpen: האם להציג את חלון הוספת המשימה
  const [isFormOpen, setIsFormOpen] = useState(false)

  // כששולחים את הטופס (לוחצים Add Task) אנחנו יוצרים משימה חדשה ומוסיפים אותה לרשימה.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // preventDefault מונע מהדפדפן לעשות "רענון דף" כמו בטופס HTML רגיל.
    event.preventDefault()
    // אם המשתמש לא כתב כותרת אמיתית - לא נוסיף משימה.
    if (!formState.title.trim()) {
      return
    }

    // "חותמת זמן" (Timestamp) כדי לדעת מתי נוצרה המשימה
    const now = new Date().toISOString()
    // בניית אובייקט משימה חדש לפי המבנה שמוגדר ב-`src/types`
    const newTask: Task = {
      // id ייחודי: אם הדפדפן תומך ב-crypto.randomUUID נשתמש בו, אחרת נייצר id פשוט.
      id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
      title: formState.title.trim(),
      description: formState.notes.trim(),
      category: formState.category.trim() || 'General',
      dueDate: formState.dueDate || 'TBD',
      progress: 0,
      statusColor: 'orange',
      assignee: { name: 'You' },
      isHighPriority: false,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    }

    // מעדכנים את הרשימה: מוסיפים את המשימה החדשה בהתחלה
    setTasks((prev) => [newTask, ...prev])
    // מאפסים את הטופס וסוגרים את החלון
    setFormState(defaultFormState)
    setIsFormOpen(false)
  }

  return (
    <div className="space-y-10 text-white">
      {/* HERO: אזור פתיחה גדול שמסביר "מה האפליקציה" */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200')] bg-cover bg-center opacity-20 blur-sm" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="mb-2 text-sm uppercase tracking-wider text-gray-400">Organize your projects</p>
            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Organize missions. Achieve <span className="text-blue-500">more</span>
            </h1>
            <p className="mb-6 text-lg text-gray-300">
              A comprehensive solution for managing projects, tracking progress, and collaborating seamlessly with your team.
            </p>
            <div className="flex flex-wrap gap-4">
            <button
              type="button"
              // כפתור שפותח את חלון הוספת המשימה
              onClick={() => setIsFormOpen(true)}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500"
            >
                Start My Mission
            </button>
              <a href="#features" className="rounded-lg px-6 py-3 text-sm font-medium text-white underline underline-offset-4 hover:text-gray-200">
                Learn More
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="rounded-xl border border-gray-700/50 bg-gray-900/60 px-6 py-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-gray-400">Total Projects</p>
              <p className="mt-1 text-3xl font-bold">19.5K+</p>
              <span className="mt-2 inline-block h-2 w-2 rounded bg-emerald-500" />
            </div>
            <div className="rounded-xl border border-gray-700/50 bg-gray-900/60 px-6 py-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wider text-gray-400">Active Users</p>
              <p className="mt-1 text-3xl font-bold">3.247</p>
              <span className="mt-2 inline-block h-2 w-2 rounded bg-purple-500" />
            </div>
          </div>
        </div>
      </section>

      {/* משימות: כרטיסים שנבנים מתוך המערך `tasks` */}
      <section id="missions" className="border-t border-gray-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-2 text-center text-3xl font-bold sm:text-4xl">
            Your missions, organized <span className="text-emerald-500">beautifully</span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
            Effortlessly manage your projects, track progress, and collaborate seamlessly with your team.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* הופכים כל משימה במערך לכרטיס על המסך */}
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg border-t-4 border-gray-800 bg-gray-900/80 p-4 ${statusBorder[task.statusColor]}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium">
                    {task.assignee.name}
                  </span>
                  <button type="button" className="text-gray-500 hover:text-white" aria-label="Options">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
                <h3 className="mb-3 font-semibold text-white">{task.title}</h3>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className={`h-full rounded-full ${statusBarFill[task.statusColor]}`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{task.progress}%</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>{task.category}</span>
                  <span>Due {task.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* אם isFormOpen=true, מציגים מודאל (חלון מעל המסך) ליצירת משימה */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-900 bg-slate-900/80 p-6 text-white shadow-xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create a new task</h3>
                <button
                  type="button"
              className="text-gray-300 hover:text-white"
                  // סגירת המודאל בלי לשמור
                  onClick={() => setIsFormOpen(false)}
                >
                  ×
                </button>
              </div>
              {/* כשהטופס נשלח, handleSubmit יוצר משימה חדשה ומוסיף לרשימה */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium text-gray-600">
                  Task Name
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                    required
                className="mt-1 w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-600">
                  Category
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-600">
                  Due Date
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-600">
                  Notes
                  <textarea
                    value={formState.notes}
                    onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                    rows={3}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <div className="flex items-center justify-end gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      // ביטול: סוגרים ומאפסים את השדות כדי להתחיל נקי בפעם הבאה
                      setIsFormOpen(false)
                      setFormState(defaultFormState)
                    }}
                className="rounded-lg px-4 py-2 text-gray-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* FEATURES: קטע "פיצ'רים" שיווקי (סטטי) */}
      <section id="features" className="bg-slate-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            <span className="text-cyan-300">Mission</span> stay on
          </h2>
          <p className="mx-auto max-w-2xl text-center text-gray-400">
            Streamline workflows and enhance collaboration with powerful project management tools.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: 'Track Progress',
                desc: 'Monitor project milestones, tasks, and deadlines with intuitive dashboards and real-time updates.',
              },
              {
                icon: (
                  <svg className="h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'Collaborate Easily',
                desc: 'Communicate with your team, share files, and get feedback all in one centralized workspace.',
              },
              {
                icon: (
                  <svg className="h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'Plan & Schedule',
                desc: 'Organize tasks, assign responsibilities, and set clear timelines for successful project execution.',
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-800 bg-slate-900/70 p-6 shadow-xl shadow-black/40">
                <div className="mb-4">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS: המלצות (סטטי) */}
      <section className="border-t border-gray-800 bg-gray-950 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-white sm:text-4xl">
            Trusted by <span className="text-cyan-400">productive</span> teams
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-400">
            See how Mission helps our customers achieve their goals with ease.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { quote: 'Mission changed how we manage our projects forever. It\'s incredibly intuitive and helps us stay on track.', stat: '8s', name: 'Sarah Chen', role: 'CEO, Innovate Solutions' },
              { quote: 'Improved our team\'s productivity by +47% since adopting Mission. Highly recommend!', stat: '+47%', name: 'Marcus Rodriguez', role: 'Product Manager, Creative Co.' },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
                <p className="mb-4 text-lg font-semibold text-white">{t.quote}</p>
                <p className="mb-4 text-sm text-gray-400">{t.stat}</p>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">{t.name[0]}</span>
                  <div>
                    <p className="font-medium text-white">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA (Call To Action): טופס הרשמה דמו */}
      <section className="bg-slate-900 border-t border-gray-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Start your <span className="text-emerald-400">mission</span>?
          </h2>
          <p className="text-gray-400">
            Ready to streamline your workflow and achieve your goals? Join Mission today!
          </p>
          <form className="space-y-4">
            <input type="text" placeholder="Full Name" className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="email" placeholder="Email Address" className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="password" placeholder="Password" className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <button type="submit" className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500">
              GET STARTED
            </button>
          </form>
          <p className="text-sm text-gray-500">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>

      {/* FOOTER: תחתית האתר (סטטי) */}
      <footer className="border-t border-gray-800 bg-gray-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-lg font-bold text-white">MISSION</span>
            <p className="mt-2 text-sm text-gray-500">© 2026 MissionFlow. All rights reserved.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h4 className="font-medium text-white">Product</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#integrations" className="hover:text-white">Integrations</a></li>
                <li><a href="#status" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white">Company</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li><a href="#about" className="hover:text-white">About Us</a></li>
                <li><a href="#careers" className="hover:text-white">Careers</a></li>
                <li><a href="#blog" className="hover:text-white">Blog</a></li>
                <li><a href="#press" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white">Legal</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#security" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
