export async function runReadUrlWorker(url: string): Promise<string> {
  try {
    // Using a public CORS proxy to fetch the content
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    if (!html) {
      return "No content found at the provided URL.";
    }
    
    // Very basic HTML stripping to get text content
    // In a real app, we'd use DOMParser or a library like cheerio
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    // Limit length to avoid blowing up the context window
    return text.substring(0, 8000);
  } catch (error: any) {
    return `Failed to read URL: ${error.message}`;
  }
}
