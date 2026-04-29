import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Registration from './pages/registration';
import PaidRegistration from './pages/paid-registration';
import Admin from './pages/admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Registration />} />
        <Route path="/paid-registration" element={<PaidRegistration />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
