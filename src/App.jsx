import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import AssessmentHand from './assessments/hand/HandAssessment'
import AssessmentHeart from './assessments/heart/HeartAssessment'
import AssessmentHead from './pages/AssessmentHead'
import Results from './pages/Results'
import Profile from './pages/Profile'
import SignIn from './pages/SignIn'
import FeedbackFollowup from './pages/FeedbackFollowup'
import TestSynthesis from './pages/admin/TestSynthesis'
import AdminRoute from './components/AdminRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import { GameContainer } from './games/eightgents'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/assessment/hand" element={<AssessmentHand />} />
      <Route path="/assessment/heart" element={<AssessmentHeart />} />
      <Route path="/assessment/head" element={<AssessmentHead />} />
      <Route path="/results" element={<Results />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/feedback/followup" element={<FeedbackFollowup />} />
      <Route path="/admin/test-synthesis" element={<TestSynthesis />} />
      <Route path="/games/8gents" element={<GameContainer />} />
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}
