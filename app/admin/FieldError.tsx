export function FieldError({ field, message }: { field: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="err" id={`${field}-err`}>
      {message}
    </p>
  );
}
