import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const URL_MAP: Record<string, string> = {
  "严骏": "https://deepwisdom.feishu.cn/wiki/K0YNwriTAiCWxekt4t8cJiI5ncb?from=from_copylink",
  "马莘权": "https://deepwisdom.feishu.cn/wiki/HK1hwo3o2i7VWckL6szc7lRbn1x",
  "李斌琦": "https://deepwisdom.feishu.cn/wiki/SEjewxZGdiMHcSkF2pMcUhOXncf",
  "杨偲妤": "https://deepwisdom.feishu.cn/docx/AfVJd7CjAoa9S2xkV5jcuiX9npe?from=from_copylink",
  "邹玙璠": "https://deepwisdom.feishu.cn/wiki/ObDbwvdzUipj1tk1S56cPSSsnug?from=from_copylink",
  "刘瑞峰": "https://deepwisdom.feishu.cn/wiki/KkZ1wBV82ifIvXkTDTNcPHZwnee",
  "刘源源": "https://deepwisdom.feishu.cn/wiki/HnYtw8mxiiObBfk19hFc7hZmnqh?from=from_copylink",
  "李泽龙": "https://deepwisdom.feishu.cn/docx/SHNRdPp9volzKhxnFlUceaDnnle",
  "薛琳蕊": "https://deepwisdom.feishu.cn/wiki/FFkqwdoZsi9jqrkeMRvc6Mamnrf",
  "陈家兴": "https://deepwisdom.feishu.cn/wiki/XodBw66u9ikBaCkn3uzcRePYnIb",
  "窦雪茹": "https://deepwisdom.feishu.cn/wiki/F2BzwmFhGi59O7k0fCQc8UklnKb?from=from_copylink",
  "曹越": "https://deepwisdom.feishu.cn/wiki/T5s7wf3ZFi89tUkDfbOcVDTan9b",
  "江培章": "https://deepwisdom.feishu.cn/wiki/SlSBwKZPSiDOllkmDR7c4dY1nMc",
  "洪炯腾": "https://deepwisdom.feishu.cn/wiki/Vj7zwOKpTiLUpykRJuSc2QGvnuc",
  "曹铭哲": "https://deepwisdom.feishu.cn/docx/RzUKdOz4PocCEaxRiywc068BnHe",
  "欧阳伊希": "https://deepwisdom.feishu.cn/wiki/IEjNwh9fsik44MkcnZwcCURxnUd",
  "陈佳杰": "https://deepwisdom.feishu.cn/wiki/VhKmwaP1yiahoDkUPr3cz7DcnDd",
  "许斯荣": "https://deepwisdom.feishu.cn/wiki/HnHPwlg50iaMZzkGsTKcjHXnnnf",
  "陈毅强": "https://deepwisdom.feishu.cn/wiki/NJSWwGayDiKdLnkSGXPcF16rnge",
  "赖永涛": "https://deepwisdom.feishu.cn/docx/WarHdmGLRocQ7pxJ1cRcpYbRncd",
  "杨倩仪": "https://deepwisdom.feishu.cn/wiki/ELmTwNp4Fi8gemkrWg5clhZ7nuc",
  "张志权": "https://deepwisdom.feishu.cn/wiki/AgbKwTCKpidhohk6vXFcOZlZnSq",
  "陈琼": "https://deepwisdom.feishu.cn/wiki/OM23waBmUig51WkSDwOcCuXZnLd?from=from_copylink",
  "张福强": "https://deepwisdom.feishu.cn/wiki/S2HKwhJPxiDo5ZkMCUtcQqCfnde",
  "王金淋": "https://deepwisdom.feishu.cn/docx/Gxq3dCwxCoIfIMxV0XocwO4Pngd",
  "李红军": "https://deepwisdom.feishu.cn/wiki/PisCw5nhkifEZWkVkSJcg2UPn1e",
  "吕鸿": "https://deepwisdom.feishu.cn/wiki/P2LOwMs5GinJxikX5kIcWPGenaf",
  "胡毅薇": "https://deepwisdom.feishu.cn/docx/FU2SduNdroiZI1xuVbBcuqfbnsY",
  "莫颖儿": "https://deepwisdom.feishu.cn/wiki/CbjGwt7TqizEm0kh023cEAXqnOb?from=from_copylink",
  "郭雨明": "https://deepwisdom.feishu.cn/wiki/XVj6wSrSMiu2lykknwQcm7vsn0b",
  "冉晨宇": "https://deepwisdom.feishu.cn/wiki/Rd1Nw8nEsicynykOJp6coMcTnDe",
  "戴智斌": "https://deepwisdom.feishu.cn/docx/RaPhdmHx2o2YuZxfJqKcTHGWnbe",
  "唐昊鸣": "https://deepwisdom.feishu.cn/wiki/MxwywphLuiePBHkXdwscB0itnUf?from=from_copylink",
  "余一铭": "https://deepwisdom.feishu.cn/docx/NLQ5dCxKeoRdltxHNAaciwQBnTg?from=from_copylink",
  "沈楚城": "https://deepwisdom.feishu.cn/wiki/KyaowCoNri38B2kd2RocEp1VnIf",
  "叶荣金": "https://deepwisdom.feishu.cn/wiki/PocWwMdGEi9tuekEmDqc1zQjnvg",
  "顾元舜": "https://deepwisdom.feishu.cn/wiki/CDVJwUoQriHeajkZO5FcDaxXnJf",
  "李娟娟": "https://deepwisdom.feishu.cn/wiki/JO6nw3w2Hisvb2kYL76crQ17nZf?from=from_copylink",
  "禹聪琪": "https://deepwisdom.feishu.cn/wiki/NMhzwe5k0izL8akzchlc1ZaVnRw",
  "曹文跃": "https://deepwisdom.feishu.cn/wiki/JGwYwmWF8ie49HkCVlUcKL7Jngg",
  "刘一": "https://deepwisdom.feishu.cn/wiki/V3OFwENT7iG2L8kRxD9cuSI6nlf",
  "徐宗泽": "https://deepwisdom.feishu.cn/wiki/X8v3womvSiPi2gk5c3wcyCtpnmD",
  "洪思睿": "https://deepwisdom.feishu.cn/wiki/CeHow3E7yisagnkrkW0ctsfan3b?from=from_copylink",
  "张建生": "https://deepwisdom.feishu.cn/wiki/ELHVwZeRHiXlrYk4fK1csFPynxd",
  "林义章": "https://deepwisdom.feishu.cn/wiki/UcAtwqFh8i9tjKkFv23c07CDncc",
  "龙辰": "https://deepwisdom.feishu.cn/wiki/MeU5wIxooiPixfkNsV5cm1mwnVe?from=from_copylink",
};

async function main() {
  // Get all users
  const usersResult = await db.execute("SELECT id, name FROM User");
  const userMap = new Map<string, string>();
  for (const row of usersResult.rows) {
    userMap.set(row.name as string, row.id as string);
  }

  // Get active cycle
  const cycleResult = await db.execute("SELECT id FROM ReviewCycle WHERE status != 'ARCHIVED' ORDER BY createdAt DESC LIMIT 1");
  if (cycleResult.rows.length === 0) { console.error("No active cycle"); process.exit(1); }
  const cycleId = cycleResult.rows[0].id as string;
  console.log(`Cycle: ${cycleId}`);

  let updated = 0, skipped = 0;
  for (const [name, url] of Object.entries(URL_MAP)) {
    const userId = userMap.get(name);
    if (!userId) { console.log(`SKIP: ${name} - user not found`); skipped++; continue; }

    // Check if self-eval exists
    const existing = await db.execute({
      sql: "SELECT id FROM SelfEvaluation WHERE cycleId = ? AND userId = ?",
      args: [cycleId, userId],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE SelfEvaluation SET sourceUrl = ? WHERE cycleId = ? AND userId = ?",
        args: [url, cycleId, userId],
      });
    } else {
      const id = `cuid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.execute({
        sql: "INSERT INTO SelfEvaluation (id, cycleId, userId, sourceUrl, status, importedContent, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'IMPORTED', '', datetime('now'), datetime('now'))",
        args: [id, cycleId, userId, url],
      });
    }
    console.log(`OK: ${name}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
}

main().catch(console.error);
