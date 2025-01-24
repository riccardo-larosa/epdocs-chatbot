function createHeaders(token: string) {
  const headers: Record<string, string> = {
    'Authorization': token ? `Bearer ${token}` : '',
    // 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  console.log(`headers: ${JSON.stringify(headers)}`);
  return headers;
}

function getBaseurl() {
  return 'https://useast.api.elasticpath.com';
}

export async function execGetRequest(
  endpoint: string,
  token: string,
  params: Record<string, any> = {},
  //baseurl: string = getBaseurl()
): Promise<any> {
  try {
    const baseurl = getBaseurl();
    console.log(`calling execGetRequest: ${baseurl + endpoint}`);
    console.log(`params: ${JSON.stringify(params)}`);
    console.log(`headers: ${JSON.stringify(createHeaders(token))}`);

  const response = await fetch(baseurl + endpoint, {
    method: 'GET',
    headers: createHeaders(token),
    ...params && { search: new URLSearchParams(params).toString() }
  });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`status: ${response.status} message: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in execGetRequest:', error);
    throw error;
  }
}

export async function execPostRequest(
  endpoint: string,
  token: string,
  body: any,
  baseurl: string = getBaseurl()
): Promise<any> {
  try {
    console.log(`calling execPostRequest: ${baseurl + endpoint}`);
    console.log(`body: ${JSON.stringify(body)}`);
    console.log(`headers: ${JSON.stringify(createHeaders(token))}`);
    const response = await fetch(baseurl + endpoint, {
      method: 'POST',
      headers: createHeaders(token),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in execPostRequest:', error);
    throw error;
  }
}

export async function execPutRequest(
  endpoint: string,
  token: string,
  body: any,
  baseurl: string = getBaseurl()
): Promise<any> {
  const response = await fetch(baseurl + endpoint, {
    method: 'PUT',
    headers: createHeaders(token),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function execDeleteRequest(
  endpoint: string,
  token: string,
  baseurl: string = getBaseurl()
): Promise<any> {
  const response = await fetch(baseurl + endpoint, {
    method: 'DELETE',
    headers: createHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}