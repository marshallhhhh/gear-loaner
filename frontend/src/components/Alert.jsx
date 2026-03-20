const colorMap = {
  error: 'bg-red-50 text-red-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
};

export default function Alert({ type = 'error', children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`p-3 rounded-lg text-sm mb-4 ${colorMap[type] || colorMap.error} ${className}`}>
      {children}
    </div>
  );
}
