import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/home.jsx";
import DashboardPage from "./pages/dashboard.jsx";
import LoginForm from "./registration_and_login_pages/login_page.jsx";
import RegistrationForm from "./registration_and_login_pages/registration_page.jsx";
import LogOut from "./registration_and_login_pages/logout.jsx";
import PageNotFound from "./pages/not_found_page.jsx";

import PerformancePrediction from "./pages/performance-prediction.jsx";
import ExplorePage from "./pages/explore.jsx";
import AchievementPage from "./pages/achievements.jsx";
import AIChatInterface from "./pages/ai-interface.jsx";
import Skill from "./pages/skill_gap.jsx";
import SettingsProfile from "./pages/setting.jsx";
import AssignmentSubmission from "./pages/assignment.jsx";

import DocumentsList from "./pages/documents/documents_list.jsx";
import DocumentsDetails from "./pages/documents/documents_details.jsx";
import FlashCardsListPage from "./pages/flash_cards/flash_cards_list.jsx";
import FlashCards from "./pages/flash_cards/flash_cards.jsx";
import QuizeTake from "./pages/quizes/quize_take.jsx";
import QuizeResult from "./pages/quizes/quize_result.jsx";

import ProtectedRoute from "./store/ProtectedRoute.jsx";
import { useAuth } from "./store/authContext.jsx";

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        {/* Public routes */}
        <Route
          path="/"
          element={
            isAuthenticated
              ? <Navigate to="/home" replace />
              : <Navigate to="/login" replace />
          }
        />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/registration" element={<RegistrationForm />} />
        <Route path="/logout" element={<LogOut />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/performance" element={<PerformancePrediction />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/achievements" element={<AchievementPage />} />
          <Route path="/ai-assistant" element={<AIChatInterface />} />
          <Route path="/skill-gap" element={<Skill />} />
          <Route path="/settings" element={<SettingsProfile />} />
          <Route path="/assignment" element={<AssignmentSubmission />} />

          <Route path="/documents" element={<DocumentsList />} />
          <Route path="/documents/:id" element={<DocumentsDetails />} />
          <Route path="/documents/:id/flashcards" element={<FlashCards />} />
          <Route path="/flashcards" element={<FlashCardsListPage />} />
          <Route path="/quizzes/:quizId" element={<QuizeTake />} />
          <Route path="/quizzes/:quizId/results" element={<QuizeResult />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<PageNotFound />} />

      </Routes>
    </Router>
  );
}

export default App;
