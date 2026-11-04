// Clash Verge Rev「全局扩展脚本」
// 订阅（sg2 上的 subconverter）只负责提供节点；策略组和规则全部在这里生成，覆盖订阅自带的。
// 规则主体用 MetaCubeX/meta-rules-dat（每日从 v2fly 同步的 geosite/geoip），自己只补少量个性化域名。
// 修改后在 Clash Verge 里「重新激活」订阅或重启即可生效。

// ---------- 自建节点 ----------

// Hysteria2 自建节点的 Brutal 带宽（2026-10-20 白天实测，约为各线路容量的 75–85%，留晚高峰余量）。
// 家宽：下行千兆 / 上行百兆（实测上行瓶颈约 60M）。设得比线路实际容量高会超发丢包，反而更慢；
// 晚高峰如果某个节点变差，先把它的 down 调低。sj 是 Oracle 免费 AMD 微型实例，硬上限 50M。
const HY2_BANDWIDTH = {
  "kr1.waytohou.xyz": { up: 60, down: 300 },
  "kr2.waytohou.xyz": { up: 60, down: 300 },
  "sjarm.waytohou.xyz": { up: 60, down: 250 },
  "sg3.waytohou.xyz": { up: 60, down: 200 },
  "gia.waytohou.xyz": { up: 60, down: 50 },
  "sj.waytohou.xyz": { up: 45, down: 45 },
};

// 按 server 识别自建节点（比按节点名可靠，subconverter 改名也不受影响）。
// 顺序即「自建优选」故障转移的优先级。
// slow：带宽只有约 50M，延迟却不高，放进地区测速组会被选中，所以只留在手动可选的组里。
const OWN_SERVERS = [
  { host: "kr2.waytohou.xyz", region: "KR" },
  { host: "kr1.waytohou.xyz", region: "KR" },
  { host: "sjarm.waytohou.xyz", region: "US" },
  { host: "sg3.waytohou.xyz", region: "SG" },
  { host: "sj.waytohou.xyz", region: "US", slow: true },
  { host: "gia.waytohou.xyz", region: "US", slow: true },
];

// 机场节点按名字分地区
const REGIONS = [
  { key: "KR", name: "🇰🇷 韩国", re: /韩国|韓|Korea|\bKR\b/i },
  { key: "JP", name: "🇯🇵 日本", re: /日本|Japan|\bJP\b/i },
  { key: "HK", name: "🇭🇰 香港", re: /香港|Hong ?Kong|\bHK\b/i },
  { key: "SG", name: "🇸🇬 新加坡", re: /新加坡|狮城|Singapore|\bSG\b/i },
  { key: "TW", name: "🇹🇼 台湾", re: /台湾|台灣|Taiwan|\bTW\b/i },
  { key: "US", name: "🇺🇸 美国", re: /美国|United States|\bUS\b/i },
];

// ---------- 果到雷达专用端口 ----------

const APW_PREFIX = "APW·";
const APW_GROUP = "果到雷达";
// 订阅地址含 token，只填在本机安装的 Script.js 里，不要提交到仓库
const APW_SUBSCRIPTIONS = {
  机场1: "<订阅地址>",
};

// ---------- 策略组名 ----------

const G = {
  default: "🚀 默认代理",
  own: "☃︎ 自建优选",
  manual: "🎯 手动选节点",
  ai: "🤖 AI",
  crypto: "🔐 Crypto",
  polymarket: "🧩 Polymarket",
  broker: "💰 Broker",
  telegram: "📲 Telegram",
  youtube: "📹 YouTube",
  media: "🎬 流媒体",
  google: "📢 Google",
  microsoft: "Ⓜ️ 微软",
  apple: "🍎 苹果",
  games: "🎮 游戏",
  speedtest: "⚡️ 测速",
  ads: "🛑 广告拦截",
  final: "🐟 漏网之鱼",
};

// ---------- 规则 ----------

const META = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo";

// 自己补的域名，排在规则集前面。只放规则集里没有、或需要改去向的。
const PERSONAL_RULES = [
  "PROCESS-NAME,qbittorrent.exe,DIRECT",
  // 自建服务器与订阅域名
  "DOMAIN-SUFFIX,waytohou.xyz," + G.default,
  "DOMAIN-SUFFIX,waytohou.eu.org," + G.default,
  // Claude 需要 segment；广告规则集会拦截它
  "DOMAIN-SUFFIX,segment.io," + G.ai,
  "DOMAIN-SUFFIX,segment.com," + G.ai,
  "DOMAIN-SUFFIX,download.todesktop.com," + G.ai, // Cursor 安装包
  // DeFi 前端会连的第三方服务（RPC、入金组件、钱包登录），跟着 Crypto 走，避免同一会话从两个国家出去
  "DOMAIN-SUFFIX,quiknode.pro," + G.crypto,
  "DOMAIN-SUFFIX,fun.xyz," + G.crypto,
  "DOMAIN-SUFFIX,privy.io," + G.crypto,
  "DOMAIN-SUFFIX,alchemy.com," + G.crypto,
  "DOMAIN-SUFFIX,reth.rs," + G.crypto,
  // Lighter 用的钱包登录（Dynamic）和地区合规检测（sunbreak），漏掉会被判成美国 IP
  "DOMAIN-SUFFIX,dynamicauth.com," + G.crypto,
  "DOMAIN-SUFFIX,dynamic-static-assets.com," + G.crypto,
  "DOMAIN-SUFFIX,dynamic.xyz," + G.crypto,
  "DOMAIN-SUFFIX,sunbreak.com," + G.crypto,
  "DOMAIN-SUFFIX,polymarket.com," + G.polymarket,
  "DOMAIN-SUFFIX,polymarketcdn.com," + G.polymarket,
  "DOMAIN-SUFFIX,mypikpak.com," + G.default,
  "DOMAIN-SUFFIX,misakaf.org," + G.default,
];

// [规则集, 去向, 额外参数]；geoip 规则集一律 no-resolve，最后的 geoip:cn 除外
const RULE_SETS = [
  ["geosite:private", "DIRECT"],
  ["geoip:private", "DIRECT", "no-resolve"],
  ["geosite:category-ads-all", G.ads],
  ["geosite:category-cryptocurrency", G.crypto],
  ["broker", G.broker],
  ["geosite:category-ai-!cn", G.ai],
  ["geosite:telegram", G.telegram],
  ["geoip:telegram", G.telegram, "no-resolve"],
  ["geosite:youtube", G.youtube],
  ["geosite:netflix", G.media],
  ["geosite:disney", G.media],
  ["geosite:spotify", G.media],
  ["geoip:netflix", G.media, "no-resolve"],
  ["geosite:google", G.google],
  ["geosite:github", G.default], // microsoft 规则集包含 github，先截住
  ["geosite:microsoft", G.microsoft],
  ["geosite:apple", G.apple],
  ["geosite:steam", G.games],
  ["geosite:speedtest", G.speedtest],
  ["geosite:geolocation-!cn", G.default],
  ["geosite:cn", "DIRECT"],
  ["geoip:cn", "DIRECT"],
];

const EXTRA_PROVIDERS = {
  broker: {
    type: "http",
    behavior: "classical",
    format: "text",
    url: "https://raw.githubusercontent.com/Arthur-vx/broker-rules/refs/heads/main/rule/Surge/Broker/Broker.list",
  },
};

function ruleProvider(id) {
  if (EXTRA_PROVIDERS[id]) return EXTRA_PROVIDERS[id];
  const [kind, name] = id.split(":");
  return {
    type: "http",
    behavior: kind === "geoip" ? "ipcidr" : "domain",
    format: "mrs",
    url: `${META}/${kind}/${name}.mrs`,
  };
}

function providerKey(id) {
  return id.replace(":", "-").replace("!", "not-");
}

// ---------- 主函数 ----------

function main(config, profileName) {
  const proxies = config.proxies || [];

  for (const p of proxies) {
    const bw = p.type === "hysteria2" && HY2_BANDWIDTH[p.server];
    if (bw) {
      p.up = `${bw.up} Mbps`;
      p.down = `${bw.down} Mbps`;
    }
  }

  // 自建节点按 OWN_SERVERS 顺序排，同一台机器的 Trojan 排在 Hysteria2 后面
  const ownRank = (p) => OWN_SERVERS.findIndex((s) => s.host === p.server);
  const own = proxies
    .filter((p) => ownRank(p) >= 0)
    .sort((a, b) => ownRank(a) - ownRank(b) || (a.type === "trojan") - (b.type === "trojan"));
  const airport = proxies.filter((p) => ownRank(p) < 0);
  const names = (list) => list.map((p) => p.name);

  const regionOf = (p) => {
    const s = OWN_SERVERS[ownRank(p)];
    if (s) return s.region;
    const r = REGIONS.find((r) => r.re.test(p.name));
    return r && r.key;
  };

  const regionGroups = REGIONS.map((r) => ({
    name: r.name,
    type: "url-test",
    proxies: names(proxies.filter((p) => regionOf(p) === r.key && !(OWN_SERVERS[ownRank(p)] || {}).slow)),
    url: "https://www.gstatic.com/generate_204",
    interval: 300,
    tolerance: 50,
    lazy: true,
  })).filter((g) => g.proxies.length > 0);
  const regionNames = regionGroups.map((g) => g.name);
  const pick = (...keys) =>
    keys.map((k) => REGIONS.find((r) => r.key === k).name).filter((n) => regionNames.includes(n));

  const ownUS = names(own.filter((p) => regionOf(p) === "US"));
  const ownNonUS = names(own.filter((p) => regionOf(p) !== "US"));
  const mediaNodes = names(own.filter((p) => p.server === "gia.waytohou.xyz" || p.server === "sg3.waytohou.xyz"));

  // 通用候选：默认代理 + 各地区 + 手动
  const general = [G.default, ...regionNames, G.manual];
  const select = (name, list) => ({ name, type: "select", proxies: list });

  const groups = [
    select(G.default, [G.own, ...regionNames, G.manual, "DIRECT"]),
    {
      name: G.own,
      type: "fallback",
      proxies: names(own),
      url: "https://www.gstatic.com/generate_204",
      interval: 300,
    },
    select(G.manual, [...names(own), ...names(airport)]),
    // AI 要求固定的美国 IP：直接列出美国自建节点，不用会自动切换的测速组
    select(G.ai, [...ownUS, ...pick("US", "JP", "SG", "KR"), G.default, G.manual]),
    // 交易所 / DeFi 要固定的非美国 IP；地区组会自动切 IP，想固定机场节点就在「手动选节点」里选
    select(G.crypto, [...ownNonUS, ...pick("JP", "SG", "HK", "TW"), G.manual, "DIRECT"]),
    select(G.polymarket, [G.crypto, ...ownNonUS, ...pick("JP", "HK", "TW"), G.manual]),
    select(G.broker, [...general, "DIRECT"]),
    select(G.telegram, general),
    select(G.youtube, general),
    select(G.media, [G.default, ...mediaNodes, ...regionNames, G.manual]),
    select(G.google, general),
    select(G.microsoft, ["DIRECT", ...general]),
    select(G.apple, ["DIRECT", ...general]),
    select(G.games, ["DIRECT", ...general]),
    select(G.speedtest, ["DIRECT", ...general]),
    select(G.ads, ["REJECT", "DIRECT"]),
    select(G.final, [G.default, "DIRECT", ...regionNames, G.manual]),
    ...regionGroups,
  ];

  const providers = {};
  const rules = [...PERSONAL_RULES];
  for (const [id, target, extra] of RULE_SETS) {
    const key = providerKey(id);
    providers[key] = {
      ...ruleProvider(id),
      path: `./ruleset/${key}.${ruleProvider(id).format === "mrs" ? "mrs" : "list"}`,
      interval: 86400,
      proxy: G.default,
    };
    rules.push(["RULE-SET", key, target, extra].filter(Boolean).join(","));
  }
  rules.push(`MATCH,${G.final}`);

  config["proxy-groups"] = groups;
  config["rule-providers"] = providers;
  config.rules = rules;

  // 果到雷达：订阅单独作为 proxy-provider 拉一份，只给 7899 端口用，不进上面的任何策略组
  const proxyProviders = config["proxy-providers"] || {};
  const used = [];
  for (const [label, url] of Object.entries(APW_SUBSCRIPTIONS)) {
    if (!/^https?:\/\//.test(url)) continue;
    const key = `apw-${label}`;
    proxyProviders[key] = {
      type: "http",
      url,
      interval: 86400,
      path: `./providers/${key}.yaml`,
      override: { "additional-prefix": `${APW_PREFIX}${label}|` },
      "health-check": { enable: false },
    };
    used.push(key);
  }
  config["proxy-providers"] = proxyProviders;
  groups.push({ name: APW_GROUP, type: "select", proxies: ["DIRECT"], use: used });

  const listeners = (config.listeners || []).filter((l) => l.name !== "apple-store-monitor");
  listeners.push({ name: "apple-store-monitor", type: "mixed", port: 7899, listen: "127.0.0.1", proxy: APW_GROUP });
  config.listeners = listeners;
  return config;
}

if (typeof module !== "undefined") module.exports = { main };
