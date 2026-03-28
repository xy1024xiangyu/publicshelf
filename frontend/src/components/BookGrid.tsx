import BookCard from './BookCard';
import type { BookListItem } from '@/lib/types';

interface BookGridProps {
  books: BookListItem[];
  emptyMessage?: string;
}

export default function BookGrid({ books, emptyMessage = 'No books found.' }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}
