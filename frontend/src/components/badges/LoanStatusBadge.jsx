import StatusBadge from './Badge.jsx';

const statusConfig = {
  OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
  ACTIVE: { label: 'Active', className: 'bg-yellow-100 text-yellow-800' },
  RETURNED: { label: 'Returned', className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
};

export default function LoanStatusBadge({ loan }) {
  const isOverdue = loan.status === 'ACTIVE' && new Date(loan.dueDate) < new Date();
  const key = isOverdue ? 'OVERDUE' : loan.status;
  const config = statusConfig[key] || { label: key, className: 'bg-gray-100 text-gray-800' };

  return <StatusBadge label={config.label} className={config.className} />;
}
