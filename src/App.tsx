import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import TripForm from './pages/TripForm';
import ExpenseForm from './pages/ExpenseForm';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Trips />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/trip/new" element={<TripForm />} />
          <Route path="/trip/:tripId" element={<TripDetail />} />
          <Route path="/trip/:tripId/edit" element={<TripForm />} />
          <Route path="/trip/:tripId/expense/new" element={<ExpenseForm />} />
          <Route path="/trip/:tripId/expense/:expenseId/edit" element={<ExpenseForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}
