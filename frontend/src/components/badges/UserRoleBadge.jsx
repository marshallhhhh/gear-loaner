import StatusBadge from './Badge.jsx';

const roleConfig = {
  ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  MEMBER: { label: 'Member', className: 'bg-gray-100 text-gray-800' },
};

export default function UserRoleBadge({ role }) {
  const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' };

  return <StatusBadge label={config.label} className={config.className} />;
}
