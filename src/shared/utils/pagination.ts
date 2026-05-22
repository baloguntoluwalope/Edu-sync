export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export const getPagination = (page = 1, limit = 20) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  return { skip, limit: safeLimit, page: safePage };
};

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});