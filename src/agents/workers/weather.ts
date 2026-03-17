export async function runWeatherWorker(latitude: number, longitude: number): Promise<string> {
  try {
    // Using Open-Meteo API which is free and requires no API key
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.current_weather) {
      return "Could not retrieve weather data for those coordinates.";
    }
    
    const cw = data.current_weather;
    return `Current Weather at (${latitude}, ${longitude}):
- Temperature: ${cw.temperature}°C
- Wind Speed: ${cw.windspeed} km/h
- Wind Direction: ${cw.winddirection}°
- Weather Code: ${cw.weathercode}
- Time: ${cw.time}
`;
  } catch (error: any) {
    return `Failed to get weather: ${error.message}`;
  }
}
