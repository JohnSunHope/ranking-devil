import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signInWithPopup } from "firebase/auth";
import { appleProvider, auth, googleProvider } from "./firebase";
import "./App.css";

type Page =
  | "home"
  | "discover"
  | "create"
  | "detail"
  | "tag"
  | "notifications"
  | "profile"
  | "lab"
  | "challenge-detail";
type Tool =
  | "图片评分"
  | "面积评分"
  | "长度评分"
  | "无限符号"
  | "数值排名"
  | "社区投票";
type Post = {
  author: string;
  avatar: string;
  title: string;
  sub: string;
  objects: string[];
  scores: string[];
  notes: string[];
  tags: string[];
  tool: Tool;
  likes: string;
  comments: number;
  remixes: number;
};

type ChallengeKind = "blind" | "throwback" | "contra" | "bracket" | "points";
type ChallengeResult = {
  kind: ChallengeKind;
  icon: string;
  mode: string;
  title: string;
  subtitle: string;
  objects: string[];
  values: string[];
  note: string;
};

const challengeMeta: Record<ChallengeKind, { icon: string; mode: string }> = {
  blind: { icon: "🙈", mode: "盲排挑战" },
  throwback: { icon: "🪃", mode: "回旋镖" },
  contra: { icon: "↯", mode: "反方接管" },
  bracket: { icon: "🏆", mode: "淘汰赛" },
  points: { icon: "💯", mode: "只剩 100 分" },
};
const posts: Post[] = [
  {
    author: "DevilElbert",
    avatar: "😈",
    title: "DC 超人 vs 漫威哨兵",
    sub: "谁才是真正的六边形战士？",
    objects: ["DC 超人", "漫威哨兵"],
    scores: ["💎", "🍅"],
    notes: ["坚不可摧", "看着很强"],
    tags: ["DC超人", "漫威哨兵", "战斗力"],
    tool: "图片评分",
    likes: "1.2k",
    comments: 86,
    remixes: 23,
  },
  {
    author: "SnowRat",
    avatar: "🏂",
    title: "Cardrona vs Coronet Peak",
    sub: "单看设施，差距比你想象得大",
    objects: ["Cardrona", "Coronet Peak"],
    scores: ["85", "62"],
    notes: ["85 设施值", "62 设施值"],
    tags: ["Cardrona", "CoronetPeak", "新西兰滑雪"],
    tool: "长度评分",
    likes: "864",
    comments: 41,
    remixes: 18,
  },
  {
    author: "NibNerd",
    avatar: "✒️",
    title: "百乐 78G vs Lamy Safari",
    sub: "顺滑度这件事，五颗星根本不够用",
    objects: ["百乐 78G", "Lamy Safari"],
    scores: ["🔥 ×55", "🔥 ×12"],
    notes: ["顺到离谱", "稳定但普通"],
    tags: ["百乐78G", "LamySafari", "钢笔"],
    tool: "无限符号",
    likes: "2.8k",
    comments: 124,
    remixes: 57,
  },
];
const toolList: { name: Tool; icon: string; hint: string }[] = [
  { name: "图片评分", icon: "🖼️", hint: "用隐喻表达态度" },
  { name: "面积评分", icon: "◉", hint: "看谁占得更多" },
  { name: "长度评分", icon: "━━", hint: "看差距有多远" },
  { name: "无限符号", icon: "🔥×∞", hint: "五颗星不够用" },
  { name: "数值排名", icon: "123", hint: "名次或数值优先" },
  { name: "社区投票", icon: "☑", hint: "把问题丢给大家" },
];
const nav: { page: Page; icon: string; label: string }[] = [
  { page: "home", icon: "⌂", label: "首页" },
  { page: "discover", icon: "⌕", label: "发现" },
  { page: "create", icon: "＋", label: "创建" },
  { page: "notifications", icon: "●", label: "通知" },
  { page: "profile", icon: "☻", label: "我的" },
];
const Logo = () => (
  <div className="logo">
    ranking <em>devil</em>
  </div>
);
const SectionTitle = ({ title, note }: { title: string; note: string }) => (
  <div className="section-title">
    <b>{title}</b>
    <small>{note}</small>
  </div>
);
function Top({
  title,
  back,
  action = "⌕",
}: {
  title?: string;
  back?: () => void;
  action?: string;
}) {
  return (
    <header className="top">
      {back ? (
        <button className="circle" onClick={back}>
          ←
        </button>
      ) : (
        <Logo />
      )}
      {title && <b className="top-title">{title}</b>}
      <button className="circle">{action}</button>
    </header>
  );
}
function Author({ post }: { post: Post }) {
  return (
    <div className="author">
      <span className="avatar">{post.avatar}</span>
      <span>
        <b>@{post.author}</b>
        <small>2 小时前</small>
      </span>
      <button>+ 关注</button>
    </div>
  );
}
function parseSymbolScore(score: string) {
  const match = score.match(/^(.*?)\s*×\s*(\d+)$/u);
  return match
    ? { symbol: match[1].trim() || "⭐", count: Number(match[2]) }
    : { symbol: score, count: 1 };
}
function SymbolCloud({
  score,
  compact = false,
}: {
  score: string;
  compact?: boolean;
}) {
  const { symbol, count } = parseSymbolScore(score),
    limit = compact ? 70 : 140,
    visible = Math.min(count, limit),
    density =
      count > 90
        ? "micro"
        : count > 36
          ? "dense"
          : count > 16
            ? "medium"
            : "loose";
  return (
    <div
      className={`symbol-cloud ${density} ${compact ? "compact" : ""}`}
      aria-label={`${symbol}，共 ${count} 个`}
    >
      <div>
        {Array.from({ length: visible }, (_, i) => (
          <span key={i}>{symbol}</span>
        ))}
      </div>
      {count > limit && <b>+{count - limit}</b>}
    </div>
  );
}
function Rating({ post, large = false }: { post: Post; large?: boolean }) {
  const values = post.scores.map((score) => Number(score) || 0),
    max = Math.max(1, ...values);
  if (post.tool === "长度评分")
    return (
      <div className={`rating bars ${large ? "large" : ""}`}>
        {post.objects.map((o, i) => (
          <div className="bar" key={o}>
            <span>
              <b>{o}</b>
              <strong>{post.scores[i]}</strong>
            </span>
            <i>
              <em style={{ width: `${(values[i] / max) * 100}%` }} />
            </i>
          </div>
        ))}
        <label>长度评分 · {post.objects.length} 个对象</label>
      </div>
    );
  if (post.tool === "面积评分")
    return (
      <div className={`rating detail-bubbles ${large ? "large" : ""}`}>
        <div>
          {post.objects.map((o, i) => {
            const size = Math.max(
              48,
              Math.sqrt(values[i] / max) * (large ? 150 : 100),
            );
            return (
              <span key={o} style={{ width: size, height: size }}>
                <b>{o}</b>
                <strong>{post.scores[i]}</strong>
              </span>
            );
          })}
        </div>
        <label>面积评分 · 真实比例</label>
      </div>
    );
  if (post.tool === "数值排名")
    return (
      <div className={`rating detail-ranking ${large ? "large" : ""}`}>
        <div>
          {post.objects
            .map((o, i) => ({ o, v: values[i] }))
            .sort((a, b) => b.v - a.v)
            .map((item, i) => (
              <span key={item.o}>
                <i>{i + 1}</i>
                <b>{item.o}</b>
                <strong>{item.v.toLocaleString()}</strong>
              </span>
            ))}
        </div>
        <label>数值排名 · 大数优先</label>
      </div>
    );
  if (post.tool === "无限符号")
    return (
      <div className={`rating symbols ${large ? "large" : ""}`}>
        {post.objects.map((o, i) => (
          <div className="symbol-rating-card" key={o}>
            <b>{o}</b>
            <SymbolCloud score={post.scores[i]} />
            <small>{post.notes[i]}</small>
          </div>
        ))}
        <label>无限符号 · {post.objects.length} 个对象</label>
      </div>
    );
  return (
    <div
      className={`rating image-score count-${post.objects.length} ${post.objects.length > 9 ? "many" : ""} ${large ? "large" : ""}`}
    >
      {post.objects.map((o, i) => (
        <div key={o}>
          <span>{post.scores[i]}</span>
          <b>{o}</b>
          <small>{post.notes[i]}</small>
        </div>
      ))}
      {post.objects.length === 2 && <i className="vs">VS</i>}
      <label>图片评分 · {post.objects.length} 个对象</label>
    </div>
  );
}
function PostCard({
  post,
  open,
  remix,
  tag,
}: {
  post: Post;
  open: () => void;
  remix: () => void;
  tag: () => void;
}) {
  const [picker, setPicker] = useState(false),
    [reaction, setReaction] = useState("❤️");
  return (
    <article className="post">
      <Author post={post} />
      <button className="post-heading" onClick={open}>
        <h1>{post.title}</h1>
        <p>{post.sub}</p>
      </button>
      <button className="rating-button" onClick={open}>
        <Rating post={post} />
      </button>
      <p className="opinion-line">{post.sub}。不服就做一个你的版本。</p>
      <div className="tags">
        {post.tags.map((t) => (
          <button key={t} onClick={tag}>
            #{t}
          </button>
        ))}
      </div>
      <div className="actions">
        <button onClick={() => setPicker(!picker)}>
          <span>{reaction}</span>
          {post.likes}
        </button>
        <button onClick={open}>
          <span>💬</span>
          {post.comments}
        </button>
        <button className="remix" onClick={remix}>
          <span>😈</span>我也来评
        </button>
        <button>
          <span>↗</span>分享
        </button>
      </div>
      {picker && (
        <div className="reactions">
          {["❤️", "👍", "🤯", "😈", "😂", "🤔"].map((r) => (
            <button
              key={r}
              onClick={() => {
                setReaction(r);
                setPicker(false);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      <button className="versions" onClick={open}>
        {post.remixes} 人发表了自己的版本 →
      </button>
    </article>
  );
}
function TileScore({ post }: { post: Post }) {
  const max = Math.max(1, ...post.scores.map((score) => Number(score) || 0));
  if (post.tool === "长度评分")
    return (
      <div className="multi-bars">
        {post.objects.map((object, i) => (
          <span key={object}>
            <b>{object}</b>
            <i>
              <em
                style={{
                  width: `${Math.max(3, ((Number(post.scores[i]) || 0) / max) * 100)}%`,
                }}
              />
            </i>
            <strong>{post.scores[i]}</strong>
          </span>
        ))}
      </div>
    );
  if (post.tool === "无限符号")
    return (
      <div className="multi-symbols">
        {post.scores.map((score, i) => (
          <span key={post.objects[i]}>
            <SymbolCloud score={score} compact />
            <b>{post.objects[i]}</b>
          </span>
        ))}
      </div>
    );
  if (post.tool === "面积评分")
    return (
      <div className="multi-bubbles">
        {post.objects.map((object, i) => {
          const size = Math.max(
            32,
            Math.sqrt((Number(post.scores[i]) || 0) / max) * 86,
          );
          return (
            <span key={object} style={{ width: size, height: size }}>
              <b>{object}</b>
              <small>{post.scores[i]}</small>
            </span>
          );
        })}
      </div>
    );
  if (post.tool === "数值排名")
    return (
      <div className="multi-ranking">
        {post.objects
          .map((object, i) => ({ object, value: Number(post.scores[i]) || 0 }))
          .sort((a, b) => b.value - a.value)
          .map((item, i) => (
            <span key={item.object}>
              <i>{i + 1}</i>
              <b>{item.object}</b>
              <strong>{item.value.toLocaleString()}</strong>
            </span>
          ))}
      </div>
    );
  return (
    <div className={`multi-images items-${post.objects.length}`}>
      {post.scores.map((score, i) => (
        <span key={`${score}${i}`}>
          <strong>{score}</strong>
          <small>{post.objects[i]}</small>
        </span>
      ))}
    </div>
  );
}
function Home({
  go,
  remix,
  open,
}: {
  go: (p: Page) => void;
  remix: (p: Post) => void;
  open: (p: Post) => void;
}) {
  const [tab, setTab] = useState("推荐");
  const multiPosts: Post[] = [
    {
      author: "MarketGoblin",
      avatar: "🛒",
      title: "三家超市的综合服务，谁占得最多？",
      sub: "面积就是话语权",
      objects: ["Pak’nSave", "New World", "Woolworths"],
      scores: ["100", "64", "25"],
      notes: ["价格王", "服务稳", "中间派"],
      tags: ["新西兰超市", "综合服务"],
      tool: "面积评分",
      likes: "4.6k",
      comments: 203,
      remixes: 91,
    },
    {
      author: "SnowRat",
      avatar: "🏂",
      title: "皇后镇四大雪场设施值排位",
      sub: "四家一起拉出来比",
      objects: ["Cardrona", "Coronet", "Remarkables", "Treble Cone"],
      scores: ["92", "78", "71", "56"],
      notes: ["", "", "", ""],
      tags: ["新西兰滑雪", "滑雪场设施"],
      tool: "长度评分",
      likes: "2.9k",
      comments: 118,
      remixes: 44,
    },
    {
      author: "PenCouncil",
      avatar: "✒️",
      title: "五支百元钢笔的真实排名",
      sub: "数字不连续，实力也不连续",
      objects: ["百乐78G", "Lamy", "Kaweco", "写乐", "白金"],
      scores: ["12324", "9998", "4300", "55", "1"],
      notes: ["", "", "", "", ""],
      tags: ["钢笔", "数值排名"],
      tool: "数值排名",
      likes: "1.8k",
      comments: 76,
      remixes: 32,
    },
    {
      author: "MemeArena",
      avatar: "🎭",
      title: "六个角色，谁最适合当队友？",
      sub: "不用数字，一张图就是评价",
      objects: ["钢铁侠", "海绵宝宝", "蝙蝠侠", "灭霸", "皮卡丘", "史瑞克"],
      scores: ["💎", "🌟", "🧠", "🗑️", "⚡", "👑"],
      notes: ["", "", "", "", "", ""],
      tags: ["最佳队友", "图片评分"],
      tool: "图片评分",
      likes: "7.2k",
      comments: 511,
      remixes: 184,
    },
    {
      author: "FoodDevil",
      avatar: "🍜",
      title: "三碗面，香到什么程度？",
      sub: "符号数量直接铺开看",
      objects: ["牛肉面", "炸酱面", "豚骨拉面"],
      scores: ["🔥 ×48", "🔥 ×21", "🔥 ×67"],
      notes: ["", "", ""],
      tags: ["面条", "无限符号"],
      tool: "无限符号",
      likes: "3.1k",
      comments: 92,
      remixes: 61,
    },
  ];
  const megaPosts: Post[] = [
    { author: "SlopeAtlas", avatar: "🗺️", title: "南岛 12 家雪场设施大乱斗", sub: "一张长度图看完整个南岛", objects: ["Cardrona","Coronet Peak","Remarkables","Treble Cone","Mt Hutt","Roundhill","Ohau","Mt Dobson","Porters","Broken River","Craigieburn","Temple Basin"], scores: ["98","91","86","82","78","72","67","59","53","45","38","29"], notes: Array(12).fill(""), tags: ["南岛雪场","12项对比"], tool: "长度评分", likes: "8.7k", comments: 634, remixes: 221 },
    { author: "NibCouncil", avatar: "✒️", title: "15 支入门钢笔，数值榜一次排完", sub: "不连续数值才能看出真正差距", objects: ["百乐78G","Lamy Safari","Kaweco Sport","白金小流星","写乐Profit","百乐笑脸","凌美恒星","百乐贵妃","施耐德Base","Waterman","派克威雅","Pelikan Twist","TWSBI Eco","Faber-Castell","英雄100"], scores: ["15000","13240","11980","10330","9650","8810","7600","6990","5420","4100","3550","2400","1330","440","55"], notes: Array(15).fill(""), tags: ["入门钢笔","15项排名"], tool: "数值排名", likes: "6.3k", comments: 417, remixes: 156 },
    { author: "MemeLeague", avatar: "🎭", title: "12 位角色，谁最适合加入你的队伍？", sub: "每个人只配一张评分图", objects: ["钢铁侠","海绵宝宝","蝙蝠侠","超人","皮卡丘","史瑞克","灭霸","悟空","蜘蛛侠","哆啦A梦","索尼克","路飞"], scores: ["💎","🧽","🧠","☀️","⚡","👑","🗑️","🔥","🕸️","🚪","💨","🏴‍☠️"], notes: Array(12).fill(""), tags: ["最佳队友","12人图片评分"], tool: "图片评分", likes: "12.4k", comments: 923, remixes: 388 },
    { author: "NoodleDevil", avatar: "🍜", title: "10 碗面，香味火力全开", sub: "实际 Emoji 数量，不拿数字糊弄", objects: ["牛肉面","炸酱面","豚骨拉面","担担面","油泼面","兰州拉面","热干面","葱油拌面","刀削面","冷面"], scores: ["🔥 ×70","🔥 ×61","🔥 ×55","🔥 ×48","🔥 ×42","🔥 ×37","🔥 ×31","🔥 ×24","🔥 ×18","🔥 ×9"], notes: Array(10).fill(""), tags: ["十碗面","无限符号"], tool: "无限符号", likes: "9.1k", comments: 588, remixes: 273 },
    { author: "BasketWars", avatar: "🛒", title: "14 家超市综合服务面积图", sub: "面积越大，综合体验越强", objects: ["Costco","Pak’nSave","New World","Woolworths","FreshChoice","Four Square","Farro","Tai Ping","Lim Chhour","H Mart","Japan Mart","Reduced to Clear","Bin Inn","SuperValue"], scores: ["100","91","84","78","69","62","55","48","40","35","29","22","15","8"], notes: Array(14).fill(""), tags: ["超市服务","14项面积"], tool: "面积评分", likes: "5.8k", comments: 362, remixes: 144 }
  ];
  const base = tab === "热门" ? [...posts].reverse() : posts;
  const list = [
    multiPosts[0],
    megaPosts[0],
    ...base,
    megaPosts[1],
    multiPosts[1],
    megaPosts[2],
    multiPosts[2],
    megaPosts[3],
    multiPosts[3],
    megaPosts[4],
    multiPosts[4],
    ...base,
  ];
  return (
    <div className="page home-grid-page">
      <header className="top home-top">
        <Logo />
        <div className="feed-tabs">
          {["推荐", "关注", "热门"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="circle" onClick={() => go("discover")}>
          ⌕
        </button>
      </header>
      <main className="waterfall">
        {list.map((post, index) => (
          <article
            className={`tile tile-${index % 4} count-${post.objects.length}`}
            key={`${post.title}-${index}`}
          >
            <button className="tile-cover" onClick={() => open(post)}>
              <div className={`tile-score tool-${post.tool}`}>
                <TileScore post={post} />
              </div>
              <em>
                {post.tool} · {post.objects.length} 个对象
              </em>
            </button>
            <div className="tile-body">
              <button className="tile-title" onClick={() => open(post)}>
                {post.title}
              </button>
              <div className="tile-tags">#{post.tags[0]}</div>
              <footer>
                <span className="tile-avatar">{post.avatar}</span>
                <small>@{post.author}</small>
                <button>❤️ {post.likes}</button>
              </footer>
              <button className="tile-remix" onClick={() => remix(post)}>
                😈 我也来评
              </button>
            </div>
          </article>
        ))}
        <div className="feed-end" role="status">
          <span>😈</span>
          <b>暂时没有更多内容了</b>
          <small>先去评一个，给这里添点新东西</small>
        </div>
      </main>
    </div>
  );
}
function Discover({
  go,
  startTag,
}: {
  go: (p: Page) => void;
  startTag: (t: string) => void;
}) {
  const [q, setQ] = useState(""),
    trends = ["新西兰超市", "超级英雄战斗力", "滑雪场", "钢笔"];
  return (
    <div className="page scroll">
      <Top title="发现" />
      <main className="content">
        <label className="search">
          ⌕
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索标签、帖子、用户"
          />
        </label>
        <SectionTitle title="正在开战 🔥" note="实时热度" />
        <div className="trend-list">
          {trends
            .filter((t) => t.includes(q))
            .map((t, i) => (
              <button key={t} onClick={() => go("tag")}>
                <i>0{i + 1}</i>
                <b>#{t}</b>
                <small>{[12.8, 9.6, 6.2, 3.1][i]}k 帖</small>
                <em>↗</em>
              </button>
            ))}
        </div>
        <SectionTitle title="最近冒头 😈" note="24 小时" />
        <div className="tag-cloud">
          {[
            "Pak’nSave面包 +328%",
            "无限符号挑战 +216%",
            "谁才是六边形战士 +184%",
            "量级碾压 +97%",
          ].map((t) => (
            <button key={t} onClick={() => go("tag")}>
              #{t}
            </button>
          ))}
        </div>
        <button className="devil-lab-entry" onClick={() => go("lab")}><span>😈</span><b>恶魔玩法实验室<small>盲排、淘汰赛、回旋镖，还有更多坏点子</small></b><i>进入 →</i></button>
        <SectionTitle title="你可能想比" note="点一下就开评" />
        <div className="suggestions">
          {[
            ["🏔️", "Cardrona"],
            ["⛷️", "Coronet Peak"],
            ["🤖", "钢铁侠"],
            ["🦸", "DC 超人"],
          ].map(([a, b]) => (
            <button key={b} onClick={() => startTag(b)}>
              <span>{a}</span>
              <b>{b}</b>
              <small>拉来比 →</small>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
function DevilLab({
  go,
  publish,
}: {
  go: (page: Page) => void;
  publish: (result: ChallengeResult) => void;
}) {
  type LabMode = ChallengeKind | "copy" | "absurd" | "heat" | "judge" | "punishment";
  const [mode, setMode] = useState<LabMode>("blind");
  const blindItems = ["超人", "蝙蝠侠", "海绵宝宝", "钢铁侠", "皮卡丘", "史瑞克"];
  const [blindStep, setBlindStep] = useState(0);
  const [blindRanks, setBlindRanks] = useState<Record<number, string>>({});
  const [points, setPoints] = useState([40, 30, 20, 10]);
  const [absurd, setAbsurd] = useState(0);
  const [caption, setCaption] = useState(0);
  const [champion, setChampion] = useState("钢铁侠");
  const [punishment, setPunishment] = useState("垃圾桶");
  const features: { mode: LabMode; icon: string; name: string; hint: string }[] = [
    { mode: "blind", icon: "🙈", name: "盲排挑战", hint: "出现一个，锁定一个" },
    { mode: "copy", icon: "😈", name: "魔鬼文案", hint: "自动生成挑衅文案" },
    { mode: "throwback", icon: "🪃", name: "回旋镖", hint: "过去的我 vs 现在的我" },
    { mode: "contra", icon: "↯", name: "反方接管", hint: "复制并反转原观点" },
    { mode: "bracket", icon: "🏆", name: "淘汰赛", hint: "一路对战到最终赢家" },
    { mode: "points", icon: "💯", name: "只剩 100 分", hint: "固定资源，必须取舍" },
    { mode: "absurd", icon: "🎲", name: "荒谬生成器", hint: "随机生成离谱对比" },
    { mode: "heat", icon: "🌋", name: "争议温度", hint: "看看评论区有多烫" },
    { mode: "judge", icon: "⚖️", name: "魔鬼裁判", hint: "总结大家到底在吵什么" },
    { mode: "punishment", icon: "🗑️", name: "惩罚位", hint: "给最后一名安排归宿" },
  ];
  const absurdIdeas = ["钢铁侠 vs 微波炉：谁更适合照顾小孩？", "Costco vs 蝙蝠侠：谁更会准备末日物资？", "海绵宝宝 vs 奥克兰交通：谁更容易让人崩溃？", "一支钢笔 vs 一家雪场：谁更值得排队？"];
  const captions = ["这不是对比，这是跨级碰瓷。", "第一名已经到终点，第二名还在停车。", "数据没有恶意，但作者可能有。", "最后一名申请退出群聊。"];
  const total = points.reduce((sum, value) => sum + value, 0);
  const chooseRank = (rank: number) => {
    if (blindStep >= blindItems.length || blindRanks[rank]) return;
    setBlindRanks((current) => ({ ...current, [rank]: blindItems[blindStep] }));
    setBlindStep((step) => step + 1);
  };
  const emit = (kind: ChallengeKind, title: string, subtitle: string, objects: string[], values: string[], note: string) =>
    publish({ kind, ...challengeMeta[kind], title, subtitle, objects, values, note });

  const panel = () => {
    if (mode === "blind")
      return <div className="lab-panel blind-lab"><label>当前突然出现</label><div className="blind-object">{blindStep < blindItems.length ? blindItems[blindStep] : "😈 排完了"}</div><p>放下后不能修改，后面的对象你还不知道。</p><div className="rank-slots">{blindItems.map((_, i) => <button className={blindRanks[i + 1] ? "filled" : ""} disabled={!!blindRanks[i + 1]} onClick={() => chooseRank(i + 1)} key={i}><span>#{i + 1}</span><b>{blindRanks[i + 1] ?? "放这里"}</b></button>)}</div>{blindStep === blindItems.length && <div className="publish-actions"><button className="lab-primary" onClick={() => emit("blind", "六位角色最佳队友盲排", "没看答案就锁死的排名，后悔也不能改。", Array.from({ length: 6 }, (_, i) => blindRanks[i + 1]), ["1", "2", "3", "4", "5", "6"], "第三个出现海绵宝宝时，我就知道这局要出事。")}>发布结果帖</button><button className="lab-secondary" onClick={() => { setBlindRanks({}); setBlindStep(0); }}>再来一次</button></div>}</div>;
    if (mode === "copy")
      return <div className="lab-panel"><label>差距检测：量级碾压</label><blockquote>{captions[caption]}</blockquote><div className="lab-row"><button onClick={() => setCaption((caption + captions.length - 1) % captions.length)}>上一个</button><button onClick={() => setCaption((caption + 1) % captions.length)}>换一句</button></div><button className="lab-primary">用在帖子里</button></div>;
    if (mode === "throwback")
      return <div className="lab-panel throwback"><div><small>三个月前的我</small><b>Cardrona</b><strong>85</strong></div><i>🪃</i><div><small>现在的我</small><b>Cardrona</b><strong>42</strong></div><blockquote>当年的嘴有多硬，现在脸就有多疼。</blockquote><button className="lab-primary" onClick={() => emit("throwback", "三个月后，我把 Cardrona 从 85 打到 42", "旧观点回旋镖精准命中自己。", ["三个月前", "现在"], ["85", "42"], "设施没变，是我的滤镜碎了。")}>发布回旋镖</button></div>;
    if (mode === "contra")
      return <div className="lab-panel contra"><label>原帖结论</label><div><span>Cardrona</span><b>85</b><i>›</i><span>Coronet Peak</span><b>62</b></div><label>反方起点</label><div className="reversed"><span>Coronet Peak</span><b>85</b><i>›</i><span>Cardrona</span><b>62</b></div><button className="lab-primary" onClick={() => emit("contra", "反方接管：Coronet Peak 才是赢家", "复制你的数据，反转你的结论。", ["Cardrona", "Coronet Peak"], ["62", "85"], "原帖只谈设施，我偏要把交通和夜场算进去。")}>接管并发布</button></div>;
    if (mode === "bracket")
      return <div className="lab-panel bracket"><label>最终决赛 · 点一个晋级</label><div><button className={champion === "钢铁侠" ? "winner" : ""} onClick={() => setChampion("钢铁侠")}>🤖<b>钢铁侠</b></button><i>VS</i><button className={champion === "蝙蝠侠" ? "winner" : ""} onClick={() => setChampion("蝙蝠侠")}>🦇<b>蝙蝠侠</b></button></div><p>🏆 当前冠军：{champion}</p><button className="lab-primary" onClick={() => emit("bracket", "超级英雄队友淘汰赛", `${champion} 从八强一路打到冠军。`, ["钢铁侠", "蝙蝠侠", "超人", "蜘蛛侠", "悟空", "皮卡丘", "海绵宝宝", "史瑞克"], [champion === "钢铁侠" ? "冠军" : "亚军", champion === "蝙蝠侠" ? "冠军" : "亚军", "四强", "四强", "八强", "八强", "八强", "八强"], "淘汰赛不讲平均分，只问最后谁还站着。")}>发布完整战报</button></div>;
    if (mode === "points")
      return <div className="lab-panel points"><header><span>还剩</span><b className={100 - total < 0 ? "over" : ""}>{100 - total}</b><small>/ 100 分</small></header>{["Cardrona", "Coronet Peak", "Mt Hutt", "Treble Cone"].map((item, i) => <label key={item}><span><b>{item}</b><strong>{points[i]}</strong></span><input type="range" min="0" max="100" value={points[i]} onChange={(event) => setPoints((values) => values.map((value, j) => i === j ? Number(event.target.value) : value))} /></label>)}<button className="lab-primary" disabled={total !== 100} onClick={() => emit("points", "四大雪场，只给你 100 分", "每多爱一个，就必须从另一个身上扣。", ["Cardrona", "Coronet Peak", "Mt Hutt", "Treble Cone"], points.map(String), "没有并列友好奖，100 分必须花得一分不剩。")}>正好 100 分，发布</button></div>;
    if (mode === "absurd")
      return <div className="lab-panel absurd"><span>🎲</span><blockquote>{absurdIdeas[absurd]}</blockquote><button className="lab-primary" onClick={() => setAbsurd((absurd + 1) % absurdIdeas.length)}>再离谱一点</button><button className="lab-secondary">就评这个</button></div>;
    if (mode === "heat")
      return <div className="lab-panel heat"><div className="thermometer"><i /><span>🌋</span></div><h3>全网不服</h3><p>反方衍生帖正在快速增加，评论双方接近 46:54。</p><div><span>轻微分歧</span><span>开战</span><span>全网不服</span></div></div>;
    if (mode === "judge")
      return <div className="lab-panel judge"><span>⚖️</span><h3>魔鬼裁判总结</h3><p>支持 Cardrona 的人更看重设施和雪道完整度；支持 Coronet Peak 的人更看重交通和夜场体验。</p><blockquote>你们真正吵的不是结果，而是标准。</blockquote><button className="lab-primary">展开观点来源</button></div>;
    return <div className="lab-panel punishment"><label>最后一名将被送进</label><div className="punishment-stage"><span>漫威哨兵</span><i>{punishment === "垃圾桶" ? "🗑️" : punishment === "小丑席" ? "🤡" : punishment === "回炉重造" ? "🔥" : "🍽️"}</i><b>{punishment}</b></div><div className="punishment-options">{["垃圾桶", "小丑席", "回炉重造", "单独开一桌"].map((item) => <button className={punishment === item ? "active" : ""} onClick={() => setPunishment(item)} key={item}>{item}</button>)}</div><button className="lab-primary">加入帖子结尾</button></div>;
  };
  return <div className="page scroll"><Top title="恶魔玩法实验室" back={() => go("discover")} action="NEW" /><main className="content lab-page"><section className="lab-hero"><span>😈</span><div><label className="eyebrow">DRAMA TOOLS</label><h1>把评分玩坏一点</h1><p>五种挑战完成后，可以直接发布结果帖。</p></div></section><div className="lab-tools">{features.map((feature) => <button className={mode === feature.mode ? "active" : ""} onClick={() => setMode(feature.mode)} key={feature.mode}><span>{feature.icon}</span><b>{feature.name}</b><small>{feature.hint}</small></button>)}</div>{panel()}</main></div>;
}

function ChallengeDetail({
  result,
  go,
}: {
  result: ChallengeResult;
  go: (page: Page) => void;
}) {
  const [share, setShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState(["这个玩法比普通打分更容易暴露真实偏好。", "不服，我已经准备接一版了。"]);
  const visual = () => {
    if (result.kind === "blind")
      return <div className="result-blind">{result.objects.map((object, i) => <div key={object}><span>#{i + 1}</span><b>{object}</b><i>已锁定</i></div>)}</div>;
    if (result.kind === "throwback")
      return <div className="result-throwback"><article><small>三个月前</small><strong>{result.values[0]}</strong><b>Cardrona</b></article><i>🪃</i><article><small>现在</small><strong>{result.values[1]}</strong><b>Cardrona</b></article><p>下降 {Number(result.values[0]) - Number(result.values[1])} 分</p></div>;
    if (result.kind === "contra")
      return <div className="result-contra"><section><small>原帖观点</small><div><b>Cardrona</b><strong>85</strong></div><div><b>Coronet Peak</b><strong>62</strong></div></section><i>观点翻转</i><section><small>反方接管</small>{result.objects.map((object, i) => <div key={object}><b>{object}</b><strong>{result.values[i]}</strong></div>)}</section></div>;
    if (result.kind === "bracket")
      return <div className="result-bracket"><div className="bracket-round"><span>钢铁侠</span><span>蝙蝠侠</span><span>超人</span><span>蜘蛛侠</span></div><div className="bracket-lines">›<br />›</div><div className="bracket-round semi"><span>钢铁侠</span><span>蝙蝠侠</span></div><div className="bracket-lines">›</div><div className="bracket-champion"><i>🏆</i><b>{result.subtitle.split(" ")[0]}</b><small>最终冠军</small></div></div>;
    return <div className="result-points"><div className="points-stack">{result.values.map((value, i) => <i key={result.objects[i]} style={{ width: `${value}%` }} />)}</div>{result.objects.map((object, i) => <div key={object}><span><i /><b>{object}</b></span><strong>{result.values[i]}<small>分</small></strong></div>)}<footer><b>100</b><span>分全部分完</span></footer></div>;
  };
  return <div className="page scroll challenge-detail"><Top title="玩法结果" back={() => go("lab")} action="···" /><main><section className="challenge-author"><span>😈</span><div><b>@DevilElbert</b><small>刚刚 · 已发布</small></div><button onClick={() => setShare(true)}>分享 ↗</button></section><header className="challenge-title"><label>{result.icon} {result.mode}</label><h1>{result.title}</h1><p>{result.subtitle}</p></header><section className={`challenge-result kind-${result.kind}`}>{visual()}</section><section className="challenge-note"><small>作者补刀</small><p>{result.note}</p></section><div className="challenge-stats"><button>❤️ 666</button><button>💬 {comments.length + 18}</button><button onClick={() => setShare(true)}>↗ 分享结果</button></div><button className="challenge-remix" onClick={() => go("lab")}><span>{result.icon}</span><b>我也挑战<small>沿用对象，做出你的版本</small></b><i>开始 →</i></button><section className="challenge-comments"><h2>评论 · {comments.length + 18}</h2>{comments.map((comment, i) => <article key={comment}><span>{i ? "🧙" : "🤓"}</span><div><b>@{i ? "RankingRebel" : "CompareLab"}</b><p>{comment}</p></div></article>)}<button onClick={() => setComments((items) => [...items, "我站反方，这就去做一个。"])}>＋ 写下你的看法</button></section></main>{share && <div className="share-backdrop" onClick={() => setShare(false)}><section className="share-sheet" onClick={(event) => event.stopPropagation()}><i>↗</i><h2>分享这份结果</h2><p>让朋友来见证，或者公开打你的脸。</p><div><button onClick={() => setCopied(true)}>🔗<b>{copied ? "已复制" : "复制链接"}</b></button><button>🖼️<b>保存结果图</b></button><button>💬<b>发给朋友</b></button></div><button className="share-cancel" onClick={() => setShare(false)}>完成</button></section></div>}</div>;
}

function Editor({tool,objects}:{tool:Tool;objects:string[]}){
  const[values,setValues]=useState(objects.map((_,i)=>tool==='图片评分'?['💎','🍅','👑'][i]??'✨':String([85,62,40][i]??20)))
  const[symbol,setSymbol]=useState('🔥'),[order,setOrder]=useState<'rank'|'value'>('value')
  const palette=['#ff2855','#8757ff','#b9ff3d','#ff9f1c','#21d4fd','#f15bb5','#f7f4f1','#5b6472']
  const[colors,setColors]=useState(objects.map((_,i)=>palette[i%palette.length]))
  const update=(i:number,v:string)=>setValues(a=>a.map((x,j)=>i===j?v:x))
  const updateColor=(i:number,color:string)=>setColors(items=>items.map((value,j)=>i===j?color:value))
  const max=Math.max(1,...values.map(v=>Math.max(0,Number(v)||0)))
  if(tool==='图片评分')return <div className="editor image-editor">{objects.map((o,i)=><div className="edit-object" key={o}><b>{o}</b><button className="image-picker"><span>{values[i]}</span><small>选择评分图片</small></button><div>{['💎','🍅','👑','🤡','🗑️','🔥'].map(e=><button key={e} onClick={()=>update(i,e)}>{e}</button>)}</div></div>)}</div>
  if(tool==='社区投票')return <div className="editor poll"><label>投票问题<input defaultValue={`${objects.join(' vs ')}，你站谁？`}/></label><div className="segment"><button className="active">只能选一个</button><button>可以选多个</button></div>{objects.map(o=><button className="poll-option" key={o}>○ {o}</button>)}<label>结果展示<select defaultValue="vote"><option value="vote">投票后显示</option><option value="always">始终显示</option><option value="end">结束后显示</option></select></label></div>
  if(tool==='无限符号')return <div className="editor"><div className="symbol-select"><b>选择符号</b>{['🔥','⭐','💀','🍅','💎'].map(s=><button className={s===symbol?'active':''} key={s} onClick={()=>setSymbol(s)}>{s}</button>)}</div>{objects.map((o,i)=><div className="symbol-editor-card" key={o}><label className="value"><b>{o}</b><input type="number" min="0" value={values[i]} onChange={e=>update(i,e.target.value)}/><span>{symbol} ×{values[i]}</span></label><SymbolCloud score={`${symbol} ×${values[i]||0}`}/></div>)}</div>
  const ranked=objects.map((o,i)=>({o,v:Number(values[i])||0})).sort((a,b)=>order==='rank'?a.v-b.v:b.v-a.v)
  const hasColors=tool==='面积评分'||tool==='长度评分'
  return <div className="editor">
    {tool==='数值排名'&&<div className="segment"><button className={order==='rank'?'active':''} onClick={()=>setOrder('rank')}>名次模式 · 小数优先</button><button className={order==='value'?'active':''} onClick={()=>setOrder('value')}>数值模式 · 大数优先</button></div>}
    {objects.map((o,i)=><div className={`value-card ${hasColors?'with-colors':''}`} key={o}><label className="value"><b>{o}</b><input type="number" min={tool==='数值排名'?undefined:'0'} value={values[i]} onChange={e=>update(i,e.target.value)}/><span>原始值</span></label>{hasColors&&<div className="color-row"><small>图形颜色</small><div>{palette.slice(0,6).map(color=><button type="button" aria-label={`选择 ${color}`} className={colors[i]===color?'active':''} style={{backgroundColor:color}} onClick={()=>updateColor(i,color)} key={color}/>)}<label className="custom-color" style={{backgroundColor:colors[i]}} title="自定义颜色"><input type="color" value={colors[i]} onChange={e=>updateColor(i,e.target.value)}/><span>＋</span></label></div></div>}</div>)}
    <div className={`preview ${tool==='面积评分'?'area':''}`}>{tool==='数值排名'?ranked.map((x,i)=><div className="rank" key={x.o}><strong>{i+1}</strong><b>{x.o}</b><span>{x.v.toLocaleString()}</span></div>):objects.map((o,i)=><div className="preview-item" key={o}><b>{o}</b><i style={tool==='面积评分'?{width:`${Math.max(14,Math.sqrt(Number(values[i])/max)*74)}px`,height:`${Math.max(14,Math.sqrt(Number(values[i])/max)*74)}px`,background:colors[i],boxShadow:`0 0 20px ${colors[i]}55`}:{width:`${Math.max(2,Number(values[i])/max*100)}%`,background:colors[i],boxShadow:`0 0 16px ${colors[i]}44`}}/><span>{values[i]}</span></div>)}</div>
  </div>
}
function Create({
  source,
  close,
  done,
}: {
  source: Post | null;
  close: () => void;
  done: () => void;
}) {
  const [step, setStep] = useState(source ? 2 : 1),
    [objects, setObjects] = useState(
      source?.objects ?? ["DC 超人", "漫威哨兵"],
    ),
    [tool, setTool] = useState<Tool>(source?.tool ?? "图片评分"),
    [input, setInput] = useState(""),
    [published, setPublished] = useState(false);
  const add = () => {
    if (input.trim()) {
      setObjects((a) => [...a, input.trim()]);
      setInput("");
    }
  };
  if (published)
    return (
      <div className="page success">
        <span>😈</span>
        <h1>放出去了</h1>
        <p>第一场架已经开了。现在等大家来不服。</p>
        <button className="primary" onClick={done}>
          查看帖子
        </button>
        <button className="secondary">分享出去 ↗</button>
        <button
          className="text"
          onClick={() => {
            setPublished(false);
            setStep(1);
          }}
        >
          再搞一个
        </button>
      </div>
    );
  return (
    <div className="page scroll">
      <Top
        title={source ? "我也来评" : "开始搞事"}
        back={close}
        action="草稿"
      />
      <main className="content create">
        <div className="progress">
          <i className={step >= 1 ? "active" : ""} />
          <i className={step >= 2 ? "active" : ""} />
          <i className={step >= 3 ? "active" : ""} />
        </div>
        {source && (
          <div className="source">
            灵感来自 @{source.author} · 对象已经替你复制好了
          </div>
        )}
        {step === 1 && (
          <section>
            <label className="eyebrow">第一步</label>
            <h1>拉谁来比？</h1>
            <p>两个、四个或者更多，数量不设限。</p>
            <div className="objects">
              {objects.map((o, i) => (
                <div key={`${o}${i}`}>
                  <span>{["🦸", "☀️", "🏔️"][i % 3]}</span>
                  <b>
                    {o}
                    <small>#{o.replaceAll(" ", "")}</small>
                  </b>
                  <button
                    onClick={() =>
                      setObjects((a) => a.filter((_, j) => i !== j))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="add">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="搜索或输入任意事物"
              />
              <button onClick={add}>添加</button>
            </div>
            <button
              className="primary"
              disabled={objects.length < 2}
              onClick={() => setStep(2)}
            >
              选评分工具 →
            </button>
          </section>
        )}
        {step === 2 && (
          <section>
            <label className="eyebrow">第二步</label>
            <h1>怎么比才够狠？</h1>
            <p>一篇帖子只用一种评分语言。</p>
            <div className="tools">
              {toolList.map((t) => (
                <button
                  className={tool === t.name ? "active" : ""}
                  onClick={() => setTool(t.name)}
                  key={t.name}
                >
                  <span>{t.icon}</span>
                  <b>{t.name}</b>
                  <small>{t.hint}</small>
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => setStep(3)}>
              用{tool}开评 →
            </button>
            <button className="text" onClick={() => setStep(1)}>
              返回修改对象
            </button>
          </section>
        )}
        {step === 3 && (
          <section>
            <label className="eyebrow">第三步</label>
            <h1>{tool}</h1>
            <p>原始评分完整保留，视觉负责把差距讲清楚。</p>
            <Editor tool={tool} objects={objects} />
            <div className="publish">
              <small>信息流标题自动生成</small>
              <h2>{objects.join(" vs ")}</h2>
              <div className="tags">
                {objects.map((o) => (
                  <span key={o}>#{o.replaceAll(" ", "")}</span>
                ))}
              </div>
              <textarea placeholder="说点什么，让大家知道你为什么这么评……" />
              <label className="toggle">
                <b>
                  允许别人「我也来评」<small>让观点继续接力</small>
                </b>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
            <button className="primary" onClick={() => setPublished(true)}>
              放出去 😈
            </button>
            <button className="text" onClick={() => setStep(2)}>
              换一种评分方式
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
function Detail({go,remix,post}:{go:(p:Page)=>void;remix:(p:Post)=>void;post:Post}){
  const[comments,setComments]=useState(['这个多对象布局终于能一眼看出差距了。','我不同意第三名，已经做了自己的版本。'])
  const[input,setInput]=useState('')
  const[view,setView]=useState<'overview'|'objects'>('overview')
  const numeric=post.scores.map(score=>Number(score)||0)
  const max=Math.max(1,...numeric)
  const ranks=post.objects.map((object,i)=>({object,value:numeric[i]})).sort((a,b)=>b.value-a.value)
  const objectVisual=(object:string,index:number)=>{
    if(post.tool==='无限符号')return <SymbolCloud score={post.scores[index]}/>
    if(post.tool==='图片评分')return <span className="carousel-image-score">{post.scores[index]}</span>
    if(post.tool==='长度评分')return <div className="carousel-length"><i style={{width:`${numeric[index]/max*100}%`}}/><strong>{post.scores[index]}</strong></div>
    if(post.tool==='面积评分'){const size=Math.max(64,Math.sqrt(numeric[index]/max)*170);return <div className="carousel-area" style={{width:size,height:size}}><strong>{post.scores[index]}</strong></div>}
    if(post.tool==='数值排名')return <div className="carousel-rank"><strong>#{ranks.findIndex(item=>item.object===object)+1}</strong><span>{numeric[index].toLocaleString()}</span></div>
    return <strong>{post.scores[index]}</strong>
  }
  return <div className="page scroll"><Top title="对比详情" back={()=>go('home')} action="···"/><main className={`detail multi-detail count-${post.objects.length} ${post.objects.length>9?'many':''}`}><div className="detail-head"><Author post={post}/><h1>{post.title}</h1><p className="detail-sub">{post.sub}</p><div className="tags">{post.tags.map(t=><button key={t} onClick={()=>go('tag')}>#{t}</button>)}</div></div>
    {post.objects.length>5&&<div className="detail-view-switch"><button className={view==='overview'?'active':''} onClick={()=>setView('overview')}>▦ 总览</button><button className={view==='objects'?'active':''} onClick={()=>setView('objects')}>↔ 逐个查看</button></div>}
    {view==='overview'?<Rating post={post} large/>:<section className="object-carousel" aria-label="横向滑动查看每个对象"><div>{post.objects.map((object,index)=><article key={object}><header><span>{String(index+1).padStart(2,'0')}</span><small>{post.objects.length} 个对象</small></header><h2>{object}</h2><div className={`carousel-score tool-${post.tool}`}>{objectVisual(object,index)}</div><footer><span>原始评分</span><b>{post.scores[index]}</b></footer></article>)}</div><p>← 左右滑动查看全部对象 →</p></section>}
    <div className="controls"><button>↺ 重播</button><button>⛶ 探索</button><button>{post.tool==='图片评分'?'评分说明':'原始数据'}</button></div><section className="object-summary"><SectionTitle title={`${post.objects.length} 个对比对象`} note={post.tool}/><div>{post.objects.map((object,i)=><button key={object} onClick={()=>{setView('objects');requestAnimationFrame(()=>document.querySelectorAll('.object-carousel article')[i]?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}))}}><b>{object}</b><strong>{post.scores[i]}</strong></button>)}</div></section><section className="opinion"><label className="eyebrow">作者观点</label><p>{post.sub}。这只是我的判断，不服欢迎直接做一个你的版本。</p></section><button className="remix-banner" onClick={()=>remix(post)}><span><b>{post.remixes} 人发表了自己的版本</b><small>对象和标题会自动复制</small></span><strong>我也来评 →</strong></button><section className="comments"><SectionTitle title={`评论 · ${comments.length+post.comments}`} note="热门 / 最新"/>{comments.map((c,i)=><article key={`${c}${i}`}><span className="avatar">{i?'🧙':'🤓'}</span><div><b>@{i?'RankingRebel':'CompareLab'}</b><p>{c}</p><small>回复 · 共鸣 {i?76:128} · 我也来评</small></div></article>)}<form onSubmit={e=>{e.preventDefault();if(input.trim()){setComments(a=>[...a,input]);setInput('')}}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="写下你的看法……"/><button>发送</button></form></section></main></div>
}
function TagPage({
  go,
  startTag,
}: {
  go: (p: Page) => void;
  startTag: (t: string) => void;
}) {
  const [follow, setFollow] = useState(false);
  return (
    <div className="page scroll">
      <Top title="#Pak’nSave面包" back={() => go("discover")} action="···" />
      <main className="content tag-page">
        <section className="tag-hero">
          <span>#</span>
          <h1>Pak’nSave面包</h1>
          <p>438 篇帖子 · 316 位作者</p>
          <div>
            <button
              className={follow ? "secondary" : "primary"}
              onClick={() => setFollow(!follow)}
            >
              {follow ? "已关注" : "关注标签"}
            </button>
            <button
              className="secondary"
              onClick={() => startTag("Pak’nSave面包")}
            >
              拿它来比
            </button>
          </div>
        </section>
        <SectionTitle title="经常被拿来对比" note="共同出现" />
        <div className="related">
          {[
            ["NewWorld面包", 186],
            ["Woolworths面包", 94],
            ["Costco面包", 51],
          ].map(([t, n]) => (
            <button key={t} onClick={() => startTag(String(t))}>
              <b>#{t}</b>
              <span>{n} 次</span>
              <i>＋</i>
            </button>
          ))}
        </div>
        <SectionTitle title="热门观点" note="热门 · 最新 · 同题最多" />
        <PostCard
          post={{
            ...posts[0],
            title: "Pak’nSave 面包 vs New World 面包",
            objects: ["Pak’nSave", "New World"],
            tags: ["Pak’nSave面包", "NewWorld面包"],
          }}
          open={() => go("detail")}
          remix={() => startTag("Pak’nSave面包")}
          tag={() => undefined}
        />
      </main>
    </div>
  );
}
function Notifications({ go }: { go: (p: Page) => void }) {
  const list = [
    ["😈", "@用户A 对你的帖子表示「离谱」", "2 分钟前"],
    ["💬", "@用户B 回复了你的评论", "10 分钟前"],
    ["🔥", "@用户C 基于你的帖子发表了自己的版本", "34 分钟前"],
    ["#", "#Pak’nSave面包 正在升温，过去 24 小时新增 128 篇帖子", "1 小时前"],
    ["＋", "@SnowRat 关注了你", "昨天"],
  ];
  return (
    <div className="page scroll">
      <Top title="通知" action="✓" />
      <main className="content">
        <div className="segment">
          <button className="active">与你有关</button>
          <button>社区动态</button>
        </div>
        <div className="notifications">
          {list.map(([a, b, c], i) => (
            <button key={b} onClick={() => i < 3 && go("detail")}>
              <span>{a}</span>
              <b>
                {b}
                <small>{c}</small>
              </b>
              {i === 2 && <i>查看版本 →</i>}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
function Profile({go,language,onLanguageChange}:{go:(p:Page)=>void;language:'zh'|'en';onLanguageChange:(language:'zh'|'en')=>void}){
  const zh=language==='zh'
  return <div className="page scroll"><Top title="@DevilElbert" action="⚙"/><main className="content profile"><section className="profile-head"><span>😈</span><h1>DevilElbert</h1><p>{zh?'什么都想拿来比一下。':'Everything deserves a comparison.'}</p><div><b>128<small>{zh?'关注':'Following'}</small></b><b>3.6k<small>{zh?'粉丝':'Followers'}</small></b><b>12.8k<small>{zh?'共鸣':'Reactions'}</small></b></div><button className="secondary">{zh?'编辑资料':'Edit profile'}</button></section><section className="style"><SectionTitle title={zh?'你的判断风格 😈':'Your rating style 😈'} note={zh?'自动生成':'Auto-generated'}/><div>{[[zh?'最爱比较':'Top topic',zh?'滑雪场':'Ski fields'],[zh?'常用工具':'Favourite tool',zh?'图片评分':'Image rating'],[zh?'最常支持':'Most supported','Cardrona'],[zh?'分歧指数':'Rebel score','72%']].map(([a,b])=><span key={a}><small>{a}</small><b>{b}</b></span>)}</div><p>{zh?'你不是来合群的。':"You weren't made to agree."}</p></section><div className="profile-tabs"><button className="active">{zh?'对比帖':'Posts'}</button><button>{zh?'衍生创作':'Remixes'}</button><button>{zh?'标签':'Tags'}</button></div><div className="profile-posts">{posts.map(p=><button key={p.title} onClick={()=>go('detail')}><span>{p.scores[0]}</span><b>{p.title}</b><small>{p.tool} · ❤️ {p.likes}</small></button>)}</div><section className="preferences"><SectionTitle title={zh?'偏好设置':'Preferences'} note={zh?'界面与体验':'Interface'}/><div className="preference-row"><span><b>{zh?'语言':'Language'}</b><small>{zh?'选择界面显示语言':'Choose the interface language'}</small></span><div className="language-switch" role="group" aria-label="Language"><button className={language==='zh'?'active':''} onClick={()=>onLanguageChange('zh')}>中文</button><button className={language==='en'?'active':''} onClick={()=>onLanguageChange('en')}>English</button></div></div><div className="preference-row muted"><span><b>{zh?'内容语言':'Content languages'}</b><small>{zh?'帖子内容保持作者原文':'Posts stay in their original language'}</small></span><em>{zh?'不自动翻译':'Original'}</em></div></section></main></div>
}
function ProductApp() {
  const [page, setPage] = useState<Page>("home"),
    [source, setSource] = useState<Post | null>(null),
    [selected, setSelected] = useState<Post>(posts[0]),
    [language, setLanguage] = useState<"zh" | "en">("zh"),
    [challenge, setChallenge] = useState<ChallengeResult | null>(null);
  const go = (p: Page) => {
      setPage(p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    open = (post: Post) => {
      setSelected(post);
      go("detail");
    },
    remix = (p: Post) => {
      setSource(p);
      go("create");
    },
    publishChallenge = (result: ChallengeResult) => {
      setChallenge(result);
      go("challenge-detail");
    },
    startTag = (t: string) =>
      remix({
        ...posts[0],
        author: "标签页",
        title: `${t} vs ?`,
        objects: [t, "添加对手"],
        tags: [t],
      }),
    current = page === "detail" || page === "tag" || page === "challenge-detail" ? "home" : page === "lab" ? "discover" : page;
  const screens: Record<Page, React.ReactNode> = {
    home: <Home go={go} remix={remix} open={open} />,
    discover: <Discover go={go} startTag={startTag} />,
    create: (
      <Create
        key={source?.title ?? "new"}
        source={source}
        close={() => {
          setSource(null);
          go("home");
        }}
        done={() => {
          if (source) setSelected(source);
          setSource(null);
          go("detail");
        }}
      />
    ),
    detail: <Detail go={go} remix={remix} post={selected} />,
    tag: <TagPage go={go} startTag={startTag} />,
    notifications: <Notifications go={go} />,
    profile: <Profile go={go} language={language} onLanguageChange={setLanguage} />,
    lab: <DevilLab go={go} publish={publishChallenge} />,
    "challenge-detail": challenge ? <ChallengeDetail result={challenge} go={go} /> : <DevilLab go={go} publish={publishChallenge} />,
  };
  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <p>
          什么都能比。
          <br />
          怎么比，你说了算。
        </p>
        <nav>
          {nav.map((n) => (
            <button
              className={current === n.page ? "active" : ""}
              key={n.page}
              onClick={() => {
                setSource(null);
                go(n.page);
              }}
            >
              <span>{n.icon}</span>
              {language === "zh" ? n.label : ({ home: "Home", discover: "Discover", create: "Create", notifications: "Alerts", profile: "Me", detail: "Home", tag: "Home", lab: "Lab" } as Record<Page, string>)[n.page]}
            </button>
          ))}
        </nav>
        <div className="me">
          <span>😈</span>
          <b>
            DevilElbert<small>@DevilElbert</small>
          </b>
        </div>
      </aside>
      <section className="phone">
        {screens[page]}
        {page !== "create" && (
          <nav className="bottom">
            {nav.map((n) => (
              <button
                className={current === n.page ? "active" : ""}
                key={n.page}
                onClick={() => {
                  setSource(null);
                  go(n.page);
                }}
              >
                <span>{n.icon}</span>
                {language === "zh" ? n.label : ({ home: "Home", discover: "Discover", create: "Create", notifications: "Alerts", profile: "Me", detail: "Home", tag: "Home", lab: "Lab" } as Record<Page, string>)[n.page]}
              </button>
            ))}
          </nav>
        )}
      </section>
      <aside className="context">
        <div>
          <label className="eyebrow">正在开战</label>
          <h3>#超级英雄战斗力</h3>
          <p>过去 24 小时新增 386 个观点。</p>
          <button onClick={() => go("tag")}>去围观 →</button>
        </div>
      </aside>
    </div>
  );
}
type AuthStep = "welcome" | "email" | "verify";

function AuthGate() {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [provider, setProvider] = useState("");
  const [busy, setBusy] = useState<"" | "Google" | "Apple">("");
  const [emailBusy, setEmailBusy] = useState(false);
  const authApiUrl = import.meta.env.VITE_AUTH_API_URL?.replace(/\/$/, "");

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setProvider(user?.providerData[0]?.providerId === "google.com" ? "Google" : user?.providerData[0]?.providerId === "apple.com" ? "Apple" : "");
    setSignedIn(Boolean(user));
  }), []);

  const enterDemoEmail = () => {
    setProvider("邮箱（验证码 Demo）");
    setSignedIn(true);
  };

  const socialSignIn = async (name: "Google" | "Apple") => {
    setError("");
    setBusy(name);
    try {
      await signInWithPopup(auth, name === "Google" ? googleProvider : appleProvider);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "登录没有完成，请再试一次";
      if (message.includes("operation-not-allowed")) {
        setError(`${name} 登录尚未在 Firebase Authentication 中启用。`);
      } else if (!message.includes("popup-closed-by-user")) {
        setError("登录没有完成。请允许弹窗后重试。");
      }
    } finally {
      setBusy("");
    }
  };

  const apiError = async (response: Response) => {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    return body?.error ?? "服务暂时不可用，请稍后再试。";
  };

  const requestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!/^\\S+@\\S+\\.\\S+$/.test(email)) {
      setError("输入一个有效的邮箱地址");
      return;
    }
    setError("");
    if (!authApiUrl) {
      setStep("verify");
      return;
    }
    setEmailBusy(true);
    try {
      const response = await fetch(`${authApiUrl}/auth/email/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      setStep("verify");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "验证码发送失败，请稍后再试。");
    } finally {
      setEmailBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!authApiUrl) {
      if (code !== "0816") {
        setError("验证码不正确，请再试一次");
        return;
      }
      enterDemoEmail();
      return;
    }
    setEmailBusy(true);
    try {
      const response = await fetch(`${authApiUrl}/auth/email/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) throw new Error(await apiError(response));
      const body = await response.json() as { customToken: string };
      await signInWithCustomToken(auth, body.customToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "验证失败，请稍后再试。");
    } finally {
      setEmailBusy(false);
    }
  };

  if (signedIn === null) return <div className="auth-shell"><main className="auth-card auth-loading">正在准备擂台…</main></div>;
  if (signedIn) return <ProductApp />;

  return (
    <div className="auth-shell">
      <main className="auth-card">
        <div className="auth-logo">ranking <em>devil</em></div>
        <p className="auth-kicker">TAKE A SIDE. START A FIGHT.</p>
        {step === "welcome" && (
          <>
            <h1>每个观点，都值得<br />被拉出来比一比。</h1>
            <p className="auth-intro">登录后发表评分、接管反方，或者给朋友的观点添把火。</p>
            <div className="auth-socials">
              <button className="auth-google" disabled={busy !== ""} onClick={() => socialSignIn("Google")}><span>G</span> {busy === "Google" ? "正在连接 Google…" : "使用 Google 继续"}</button>
              <button className="auth-apple" disabled={busy !== ""} onClick={() => socialSignIn("Apple")}><span>●</span> {busy === "Apple" ? "正在连接 Apple…" : "使用 Apple 继续"}</button>
            </div>
            {error && <p className="auth-error auth-social-error">{error}</p>}
            <div className="auth-divider"><span>或</span></div>
            <button className="auth-email" onClick={() => { setError(""); setStep("email"); }}>使用邮箱注册 / 登录 →</button>
            <small className="auth-terms">继续即表示你同意社区规则。攻击观点，别攻击人。</small>
          </>
        )}
        {step === "email" && (
          <>
            <button className="auth-back" onClick={() => setStep("welcome")}>← 返回</button>
            <h1>用邮箱进场</h1>
            <p className="auth-intro">我们会发送一个 6 位验证码，验证后即可完成注册。</p>
            <form className="auth-form" onSubmit={requestCode}>
              <label>邮箱地址<input autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" /></label>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-submit" disabled={emailBusy}>{emailBusy ? "正在发送…" : "发送验证码"}</button>
            </form>
          </>
        )}
        {step === "verify" && (
          <>
            <button className="auth-back" onClick={() => { setError(""); setStep("email"); }}>← 换一个邮箱</button>
            <div className="auth-code-icon">✉️</div>
            <h1>查收验证码</h1>
            <p className="auth-intro">验证码已发送至 <b>{email}</b>。验证后即可完成账号注册。</p>
            <form className="auth-form" onSubmit={verifyCode}>
              <label>6 位验证码<input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\\D/g, ""))} placeholder="000000" /></label>
              <small className="auth-demo-note">{authApiUrl ? "验证码将发送至你的邮箱，有效期 10 分钟。" : "本地预览使用 Demo 验证码：0816；部署后会自动切换真实邮件。"}</small>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-submit" disabled={emailBusy}>{emailBusy ? "正在验证…" : "验证并进入 ranking devil"}</button>
              <button type="button" className="auth-resend" disabled={emailBusy} onClick={() => { setCode(""); setError(""); void requestCode(); }}>重新发送验证码</button>
            </form>
          </>
        )}
        {provider && <small className="auth-provider">已通过 {provider} 登录</small>}
      </main>
    </div>
  );
}

export default AuthGate;
