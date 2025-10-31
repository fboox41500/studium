import { Navigate, Route, Routes } from 'react-router-dom';
import ReactionDetailPage from './pages/ReactionDetailPage';
import SearchPage from './pages/SearchPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/search" replace />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/reaction/:reactionId" element={<ReactionDetailPage />} />
    </Routes>
  );
};

export default App;
