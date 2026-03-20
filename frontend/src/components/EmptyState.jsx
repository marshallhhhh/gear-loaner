export default function EmptyState({ colSpan, message = 'No items found.' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-gray-400">
        {message}
      </td>
    </tr>
  );
}
