import { BadRequestException } from '@nestjs/common';

export function validatePagination(page: any, limit: any) {
  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    throw new BadRequestException(
      'Invalid page number. It must be a positive integer.',
    );
  }
  if (!Number.isInteger(limitNum) || limitNum < 1) {
    throw new BadRequestException(
      'Invalid limit value. It must be a positive integer.',
    );
  }

  return { pageNum, limitNum };
}
