const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

/** Parse page / pageSize query params into skip / take values. */
export function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
