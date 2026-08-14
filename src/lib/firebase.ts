import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCXvJemNVifdDk6pml8upLXCYwCm5tD0R0",
  authDomain: "inkhel-quiz.firebaseapp.com",
  projectId: "inkhel-quiz",
  storageBucket: "inkhel-quiz.firebasestorage.app",
  messagingSenderId: "248099638510",
  appId: "1:248099638510:web:79538a27c7b38b8227f7ff",
  measurementId: "G-N8CQVPR9M9",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
