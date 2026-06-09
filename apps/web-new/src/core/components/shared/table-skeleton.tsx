import { Skeleton } from '@/core/ui/skeleton';
import { TableBody, TableCell, TableRow } from '@/core/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
}

export function TableSkeleton({ rows = 5, columns }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}
