const FEISHU_APP_ID = process.env.FEISHU_APP_ID!;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET!;
const FEISHU_BASE = "https://open.feishu.cn/open-apis";

let tenantTokenCache: { token: string; expiresAt: number } | null = null;

export async function getTenantAccessToken(): Promise<string> {
  if (tenantTokenCache && Date.now() < tenantTokenCache.expiresAt) {
    return tenantTokenCache.token;
  }

  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant token: ${data.msg}`);
  }

  tenantTokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire - 300) * 1000,
  };

  return data.tenant_access_token;
}

export async function getUserAccessToken(code: string) {
  const tenantToken = await getTenantAccessToken();

  const res = await fetch(`${FEISHU_BASE}/authen/v1/oidc/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get user token: ${data.msg}`);
  }

  return data.data;
}

export async function getFeishuUserInfo(userAccessToken: string) {
  const res = await fetch(`${FEISHU_BASE}/authen/v1/user_info`, {
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get user info: ${data.msg}`);
  }

  return data.data;
}

export async function sendFeishuMessage(openId: string, content: {
  title: string;
  content: string;
  actionUrl?: string;
}) {
  const tenantToken = await getTenantAccessToken();

  const cardContent = {
    config: { wide_screen_mode: true },
    elements: [
      {
        tag: "markdown",
        content: content.content,
      },
      ...(content.actionUrl
        ? [
            {
              tag: "action",
              actions: [
                {
                  tag: "button",
                  text: { tag: "plain_text", content: "前往操作" },
                  type: "primary",
                  url: content.actionUrl,
                },
              ],
            },
          ]
        : []),
    ],
    header: {
      title: { tag: "plain_text", content: content.title },
      template: "blue",
    },
  };

  const res = await fetch(`${FEISHU_BASE}/im/v1/messages?receive_id_type=open_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: "interactive",
      content: JSON.stringify(cardContent),
    }),
  });

  const data = await res.json();
  return data;
}

export async function fetchFeishuDepartments(tenantToken: string, parentId = "0") {
  const allItems: Record<string, unknown>[] = [];
  let pageToken = "";
  do {
    const url = `${FEISHU_BASE}/contact/v3/departments?parent_department_id=${parentId}&page_size=50${pageToken ? `&page_token=${pageToken}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    const data = await res.json();
    allItems.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);
  return allItems;
}

export async function fetchFeishuDepartmentUsers(tenantToken: string, departmentId: string) {
  const allItems: Record<string, unknown>[] = [];
  let pageToken = "";
  do {
    const url = `${FEISHU_BASE}/contact/v3/users?department_id=${departmentId}&page_size=50${pageToken ? `&page_token=${pageToken}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    const data = await res.json();
    allItems.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);
  return allItems;
}

export function getFeishuOAuthUrl(redirectUri: string, state: string) {
  return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${FEISHU_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}
