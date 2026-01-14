'use client';

import { useEffect } from 'react';
import { BookingProvider } from './_components/booking-context';
import { BookingFlow } from './_components/booking-flow';

export default function BookingPage() {
  // Global error handler to catch and log pattern matching errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error to catch pattern errors
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('pattern') || errorMessage.includes('SyntaxError')) {
        console.group('🔍 Pattern Error Detected');
        originalError('Error:', ...args);
        console.trace('Stack trace:');
        console.groupEnd();
      }
      originalError.apply(console, args);
    };

    // Catch unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('pattern') || event.message?.includes('SyntaxError')) {
        console.group('🔍 Unhandled Pattern Error');
        console.error('Message:', event.message);
        console.error('File:', event.filename);
        console.error('Line:', event.lineno);
        console.error('Column:', event.colno);
        console.error('Error object:', event.error);
        console.trace('Stack trace:');
        console.groupEnd();
      }
    };

    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || String(reason);
      if (message?.includes('pattern') || message?.includes('SyntaxError')) {
        console.group('🔍 Unhandled Promise Rejection (Pattern Error)');
        console.error('Reason:', reason);
        console.trace('Stack trace:');
        console.groupEnd();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <BookingProvider>
      <BookingFlow />
    </BookingProvider>
  );
}
