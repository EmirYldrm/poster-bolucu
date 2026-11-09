const resourceErrorPattern = /out of memory|insufficient memory|memory allocation|allocation failed|array buffer.{0,30}(?:large|allocat|length)|(?:large|allocat|length).{0,30}array buffer|invalid array length|maximum (?:call stack|array|buffer)|heap.{0,20}(?:limit|memory|exhaust)|out of range.{0,30}(?:buffer|array)/i;

export function isPdfResourceError(error) {
  const message = typeof error === 'string' ? error : error?.message;
  return typeof message === 'string' && resourceErrorPattern.test(message);
}
