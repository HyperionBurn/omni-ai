export async function runTimeWorker(timezone?: string): Promise<string> {
  try {
    const date = new Date();
    
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: timezone || 'UTC',
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      timeZoneName: 'short'
    };
    
    // Validate timezone if provided
    if (timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      } catch (e) {
        throw new Error(`Invalid timezone: ${timezone}. Please use IANA time zone names like 'America/New_York'.`);
      }
    }
    
    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
    
    return `The current time and date in ${timezone || 'UTC'} is: ${formattedDate}`;
  } catch (error: any) {
    return `Failed to get current time: ${error.message}`;
  }
}
