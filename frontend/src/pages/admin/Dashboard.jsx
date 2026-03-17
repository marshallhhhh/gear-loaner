import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../config/api.js';

export default function Dashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const token = await getToken();
        const data = await api('/admin/stats', { token });
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [getToken]);

  async function handleExport(path, filename) {
    try {
      const token = await getToken();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading dashboard…</div>;
  }

  // Use explicit text color classes so Tailwind's purge/JIT recognizes them.
  // Having only `bg-...` strings and deriving `text-...` at runtime can be
  // removed by Tailwind if the `text-...` class isn't present in source.
  const cards = [
    {
      label: 'Total Items',
      value: stats.totalGear,
      linkTo: '/admin/gear',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-500',
    },
    {
      label: 'Available',
      value: stats.availableGear,
      linkTo: '/admin/gear?status=AVAILABLE',
      bgColor: 'bg-green-500',
      textColor: 'text-green-500',
    },
    {
      label: 'Checked Out',
      value: stats.checkedOut,
      linkTo: '/admin/gear?status=CHECKED_OUT',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-500',
    },
    {
      label: 'Lost',
      value: stats.lost + (stats.reportedLost || 0),
      linkTo: '/admin/gear?status=LOST',
      bgColor: 'bg-red-500',
      textColor: 'text-red-500',
      subtitle: stats.reportedLost ? `${stats.reportedLost} reported` : null,
    },
    {
      label: 'Reported Lost',
      value: stats.reportedLost || 0,
      linkTo: '/admin/gear?status=REPORTED_LOST',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-500',
    },
    {
      label: 'Active Loans',
      value: stats.activeLoans,
      linkTo: '/admin/loans?status=ACTIVE',
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-500',
    },
    {
      label: 'Overdue',
      value: stats.overdueLoans,
      linkTo: '/admin/loans?status=OVERDUE',
      bgColor: 'bg-red-600',
      textColor: 'text-red-600',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers,
      linkTo: '/admin/users',
      bgColor: 'bg-indigo-500',
      textColor: 'text-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.linkTo}
            className="bg-white rounded-xl shadow p-4 hover:shadow-md transition block"
          >
            <div className={`text-3xl font-bold ${card.textColor}`}>{card.value}</div>
            <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            {card.subtitle && <div className="text-xs text-gray-400 mt-0.5">{card.subtitle}</div>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/gear"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition block"
        >
          <h3 className="font-semibold text-lg mb-1">Gear Management</h3>
          <p className="text-sm text-gray-500">Add, edit, and manage gear inventory</p>
        </Link>

        <Link
          to="/admin/loans"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition block"
        >
          <h3 className="font-semibold text-lg mb-1">Loan History</h3>
          <p className="text-sm text-gray-500">View and manage all loans</p>
        </Link>

        <Link
          to="/admin/users"
          className="bg-white rounded-xl shadow p-6 hover:shadow-md transition block"
        >
          <h3 className="font-semibold text-lg mb-1">User Management</h3>
          <p className="text-sm text-gray-500">Manage members and admins</p>
        </Link>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-lg mb-2">Export Data</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('/admin/export/gear', 'gear.csv')}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              Gear CSV
            </button>
            <button
              onClick={() => handleExport('/admin/export/loans', 'loans.csv')}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              Loans CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
