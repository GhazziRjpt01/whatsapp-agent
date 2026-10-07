import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import InboxPage from '@/pages/InboxPage'
import ContactsPage from '@/pages/ContactsPage'
import LeadsPage from '@/pages/LeadsPage'
import AppointmentsPage from '@/pages/AppointmentsPage'
import AiAgentPage from '@/pages/AiAgentPage'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import TeamPage from '@/pages/TeamPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage portal="choose" />} />
      <Route path="/login/ceo" element={<LoginPage portal="ceo" />} />
      <Route path="/login/team" element={<LoginPage portal="team" />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/ai-agent" element={<AiAgentPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
