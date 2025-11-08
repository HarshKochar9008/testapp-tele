// Example usage of the global notification system
// This file demonstrates how to use the notification functions

import { useNotification } from '../context/NotificationContext';

// Example component showing how to use the notification system
export const ExampleNotificationUsage = () => {
  const { showComingSoon, showNotification } = useNotification();

  const handleComingSoonClick = () => {
    // Show the default "Coming Soon" message
    showComingSoon();
  };

  const handleCustomComingSoonClick = () => {
    // Show a custom "Coming Soon" message
    showComingSoon("This amazing feature is almost ready! Stay tuned for updates.");
  };

  const handleInfoClick = () => {
    // Show an info notification
    showNotification("Information", "This is an informational message.", "info");
  };

  const handleSuccessClick = () => {
    // Show a success notification
    showNotification("Success!", "Operation completed successfully.", "success");
  };

  const handleErrorClick = () => {
    // Show an error notification
    showNotification("Error", "Something went wrong. Please try again.", "error");
  };

  return (
    <div>
      <button onClick={handleComingSoonClick}>Show Coming Soon</button>
      <button onClick={handleCustomComingSoonClick}>Show Custom Coming Soon</button>
      <button onClick={handleInfoClick}>Show Info</button>
      <button onClick={handleSuccessClick}>Show Success</button>
      <button onClick={handleErrorClick}>Show Error</button>
    </div>
  );
};

// Usage in any component:
// 1. Import the hook: import { useNotification } from '../context/NotificationContext';
// 2. Use the hook: const { showComingSoon, showNotification } = useNotification();
// 3. Call the function: showComingSoon() or showComingSoon("Custom message")
// 4. Or use showNotification("Title", "Message", "type") for other types 