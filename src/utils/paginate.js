/**
 * Build paginated query options from request query params
 */
const getPaginationOptions = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 12));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build sort object from query param
 * sortBy: newest | oldest | highest_rated | most_exchanges
 */
const getSortOptions = (sortBy) => {
  switch (sortBy) {
    case 'oldest':
      return { createdAt: 1 };
    case 'highest_rated':
      return { ratingAverage: -1 };
    case 'most_exchanges':
      return { completedExchanges: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
};

module.exports = { getPaginationOptions, getSortOptions };
