// src/utils/api.ts
export const apiFetch = async (url: string, endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching ${endpoint} (Attempt ${i + 1}):`, url);
        const response = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ReactNative',
            'ngrok-skip-browser-warning': 'true',
            ...options.headers,
          },
        });
        const contentType = response.headers.get('content-type');
        const rawResponse = await response.text();
        console.log(`${endpoint} Status:`, response.status);
        console.log(`${endpoint} Content-Type:`, contentType);
        console.log(`${endpoint} Raw Response:`, rawResponse.slice(0, 100));
        if (!response.ok) {
          throw new Error(`${endpoint} fetch failed: ${response.status} ${response.statusText}`);
        }
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`${endpoint} response is not JSON. Retrying...`);
          if (i === retries - 1) {
            throw new Error(
              `${endpoint} response is not JSON. Likely ngrok authentication page. Open ${url} in your emulator/device browser to authenticate.`
            );
          }
          continue;
        }
        return JSON.parse(rawResponse);
      } catch (error) {
        if (i === retries - 1) throw error;
      }
    }
  };