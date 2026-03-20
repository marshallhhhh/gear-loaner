import StatusBadge from './Badge.jsx';

const config = {
  true: { label: 'Active', className: 'bg-green-100 text-green-800' },
  false: { label: 'Inactive', className: 'bg-red-100 text-red-800' },
};

export default function ActiveStatusBadge({ isActive }) {
  const { label, className } = config[isActive] || config.false;
  return <StatusBadge label={label} className={className} />;
}
