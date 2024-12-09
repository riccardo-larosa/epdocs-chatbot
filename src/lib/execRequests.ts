

function createHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function getBaseurl() {
  return 'https://useast.api.elasticpath.com';
}

export async function execGetRequest(
  endpoint: string,
  token: string,
  params?: Record<string, any>,
  baseurl: string = getBaseurl()
): Promise<any> {
  const response = await fetch(baseurl + endpoint, {
    method: 'GET',
    headers: createHeaders(token),
    ...params && { search: new URLSearchParams(params).toString() }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
