export async function checkGraphStatus(
  apiUrl: string,
  apiKey: string | null,
  authScheme?: string,
): Promise<boolean> {
  try {
    const headers = new Headers();
    if (apiKey) headers.set("X-Api-Key", apiKey);
    if (authScheme) headers.set("X-Auth-Scheme", authScheme);

    const res = await fetch(`${apiUrl}/info`, {
      headers,
    });

    return res.ok;
  } catch {
    // The caller renders a user-facing connection toast. This is an expected
    // startup condition, so do not log it as a console error (Next dev overlay
    // promotes console errors into a red runtime screen).
    return false;
  }
}
