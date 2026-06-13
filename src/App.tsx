import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelect from '@/pages/RoleSelect';
import Login from '@/pages/Login';
import BatchList from '@/pages/BatchList';
import QualityControl from '@/pages/QualityControl';
import PickupVerify from '@/pages/PickupVerify';
import OverdueCharge from '@/pages/OverdueCharge';
import ExceptionHandle from '@/pages/ExceptionHandle';
import CashierConfirm from '@/pages/CashierConfirm';
import TransferOutsource from '@/pages/TransferOutsource';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/batches" element={<BatchList />} />
        <Route path="/qc" element={<QualityControl />} />
        <Route path="/pickup" element={<PickupVerify />} />
        <Route path="/overdue" element={<OverdueCharge />} />
        <Route path="/exceptions" element={<ExceptionHandle />} />
        <Route path="/cashier" element={<CashierConfirm />} />
        <Route path="/transfer" element={<TransferOutsource />} />
      </Routes>
    </Router>
  );
}
