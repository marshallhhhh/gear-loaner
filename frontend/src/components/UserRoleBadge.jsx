const roleConfig = {
  ADMIN: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
  MEMBER: { label: 'Member', className: 'bg-gray-100 text-gray-800' },
};

export default function UserRoleBadge({ role }) {
  const config = roleConfig[role] || { label: role, className: 'bg-gray-100 text-gray-800' };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
