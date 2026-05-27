import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('isLoggedIn') === 'true' &&
    localStorage.getItem('token')
  )

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  return <Dashboard />
}

export default App