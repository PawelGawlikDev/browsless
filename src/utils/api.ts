const parseResponse = (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};
const request = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(errorBody || `Request failed with status ${response.status}`);
  }
  return parseResponse(response);
};
export const fetchApi = (input: RequestInfo | URL, init?: RequestInit) => {
  return request(input, init);
};
export const fetchGapi = (input: RequestInfo | URL, init?: RequestInit) => {
  return request(input, init);
};
