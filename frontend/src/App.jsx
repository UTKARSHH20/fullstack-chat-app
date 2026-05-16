import { Routes, Route, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { Toaster } from "react-hot-toast"
import Navbar from "../components/Navbar"
import HomePage from "../pages/HomePage"
import LoginPage from "../pages/LoginPage"
import SignUpPage from "../pages/SignUpPage"
import ChatPage from "../pages/ChatPage"
import SettingsPage from "../pages/SettingsPage"
import ProfilePage from "../pages/ProfilePage"
import CallHandler from "../components/CallHandler"
import useAuthStore from "./store/useAuthStore"
import useCallStore from "./store/useCallStore"

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore()
  const { subscribeToCalls, unsubscribeFromCalls } = useCallStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (authUser) {
      subscribeToCalls()
    } else {
      unsubscribeFromCalls()
    }
    return () => unsubscribeFromCalls()
  }, [authUser, subscribeToCalls, unsubscribeFromCalls])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <Toaster position="top-center" />
      <CallHandler />
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App