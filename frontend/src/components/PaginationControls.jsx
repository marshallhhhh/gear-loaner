/**
 * Reusable pagination controls (Previous / Page X of Y / Next).
 *
 * @param {{ pagination, onPageChange, shownCount, label }} props
 */
export default function PaginationControls({
  pagination,
  onPageChange,
  shownCount,
  label = 'items',
}) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>
        Showing {shownCount} of {pagination.total} {label}
      </span>
      <div className="flex gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-3 py-1">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
