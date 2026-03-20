import { useNavigate } from 'react-router-dom';

export default function BackLink({ to, label }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="text-primary-600 hover:underline text-sm mb-4 inline-flex items-center gap-1"
    >
      ← {label}
    </button>
  );
}
