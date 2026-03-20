const sizeConfig = {
  small: 'px-2 py-0.5 text-xs',
  medium: 'px-3 py-1 text-sm',
  large: 'px-4 py-1.5 text-base',
};

export default function StatusBadge({ label, className, size = 'small' }) {
  const sizeClasses = sizeConfig[size] || sizeConfig.small;
  return (
    <span className={`inline-block rounded-full font-medium ${sizeClasses} ${className}`}>
      {label}
    </span>
  );
}
