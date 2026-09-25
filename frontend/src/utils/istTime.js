/**
 * Returns greeting and formatted clock in Indian Standard Time (IST)
 */
export function getISTGreetingData() {
  const now = new Date();

  // Extract hour in Asia/Kolkata timezone (0 - 23)
  const istHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(now),
    10
  );

  let greeting = "Good evening";
  if (istHour >= 4 && istHour < 12) {
    greeting = "Good morning";
  } else if (istHour >= 12 && istHour < 17) {
    greeting = "Good afternoon";
  }

  // Format live IST clock string (e.g., "04:20:15 pm")
  const istTimeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return { greeting, istTimeStr };
}