bash
cat > /mnt/user-data/outputs/index.js << 'ENDOFFILE'
/**
 * ═══════════════════════════════════════════════════════════════
 *   UNKNOWNSUBMITTER — Islamic Knowledge Bot
 * ═══════════════════════════════════════════════════════════════
 *
 *  Static Categories: tawheed, aqeedah, rulings,
 *                     pillarsofislam, pillarsofiman
 *  Dynamic Categories: CRUD via admin commands
 *  Part Management: add, edit, delete, insert, move, list
 *
 *  Info Commands:
 *  /islam /muslim /shahadah /salah /zakah /sawm /hajj
 *  /pillarsofislam /pillarsofiman /qadar /wudu /ghusl
 *  /tawheedtypes /islamimanihsan /prophetnames
 *  /islamiccalendar /sunnahprayers
 *
 *  ENV:  DISCORD_TOKEN  (required)
 *        BOT_OWNER_ID   (required for owner-only commands)
 *
 * ═══════════════════════════════════════════════════════════════
 */

require("dotenv").config();
const {
  Client, GatewayIntentBits, EmbedBuilder,
  SlashCommandBuilder, REST, Routes,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs");

// ─────────────────────────────────────────────────────
//  PERSISTENCE
// ─────────────────────────────────────────────────────
const DATA_FILE = "./data.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { categories: {}, parts: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { categories: {}, parts: {} }; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
let DB = loadData();

// ─────────────────────────────────────────────────────
//  STATIC CATEGORIES
// ─────────────────────────────────────────────────────
const STATIC_CATEGORIES = {
  tawheed:        { name: "Tawheed",          color: 0x1B5E20, emoji: "📖", description: "The Oneness of Allah — the foundation of Islam" },
  aqeedah:        { name: "Aqeedah",          color: 0x1A237E, emoji: "🌙", description: "Islamic Creed & Belief" },
  rulings:        { name: "Rulings",          color: 0x4A148C, emoji: "📜", description: "Islamic Jurisprudence & Rulings" },
  pillarsofislam: { name: "Pillars of Islam", color: 0x006064, emoji: "🕌", description: "The Five Pillars of Islam" },
  pillarsofiman:  { name: "Pillars of Iman",  color: 0x3E2723, emoji: "✨", description: "The Six Pillars of Faith" },
};

for (const [key, meta] of Object.entries(STATIC_CATEGORIES)) {
  if (!DB.categories[key]) {
    DB.categories[key] = { ...meta, static: true };
    DB.parts[key] = {};
  }
}
saveData(DB);

// ─────────────────────────────────────────────────────
//  CUSTOM EMOJIS  (all from server — exact IDs)
// ─────────────────────────────────────────────────────
const E = {
  // ── server set 1 (1505…) ─────────────────────────────
  dice:         "<:dice:1505333329111683152>",
  bitcoin:      "<:bitcoin:1505333071434612927>",
  blueflag:     "<:blueflag:1505333144528879616>",
  book:         "<:book:1505332214051766384>",
  box:          "<:box:1505332088109400164>",
  cow:          "<:cow:1505332964790108311>",
  diamond:      "<:diamond:1505333046688219156>",
  earth:        "<:earth:1505332252953936154>",
  exclaim:      "<:exclamationmark:1505332358600196187>",
  folder:       "<:folder:1505332121982603275>",
  greenflag:    "<:greenflag:1505333142184136786>",
  icecube:      "<:icecube:1505332996176351464>",
  idea:         "<:idea:1505332431027310632>",
  letter:       "<:letter:1505332856925327459>",
  magnet:       "<:magnet:1505332668701872239>",
  magnify:      "<:magnifyingglass:1505332144162209873>",
  message:      "<:message:1505332064814370847>",
  pencil:       "<:pencil:1505332155482640495>",
  pin:          "<:pin:1505332838030114927>",
  purpleflag:   "<:purpleflag:1505333146793541725>",
  questionmark: "<:questionmark:1505332395627249714>",
  redflag:      "<:redflag:1505332395627249714>",
  sandclock:    "<:sandclock:1505332806258135150>",
  settings:     "<:settings:1505332485511319633>",
  stars:        "<:stars:1505332605426466937>",
  sun:          "<:sun:1505332915821613149>",
  trash:        "<:trash:1505332205369430126>",
  tree:         "<:tree:1505333276720631899>",
  waterdrop:    "<:waterdrop:1505332596681343198>",
  yellowflag:   "<:yellowflag:1505333139965480971>",
  // ── server set 2 (1490… / 1499… / 1502… / 1503…) ────
  incorrect_x:  "<:incorrect:1490332609102745600>",
  incorrect_o:  "<:incorrect:1490332611304755250>",
  key:          "<:key:1490332311965667469>",
  lock:         "<:lock:1490332316957016316>",
  screwdriver:  "<:screwdriver:1499021421328728204>",
  skull:        "<:skull:1502767276649222175>",
  speaker:      "<:speaker:1490332307113115768>",
  correct:      "<:correct:1490332296086163676>",
  copy:         "<:copy:1499021402672594954>",
  newspaper:    "<:newspaper:1490332321872740492>",
  paper:        "<:paper:1490332319221809313>",
  recycle:      "<:recycle:1490332293544411336>",
  hazard:       "<:hazard:1490332614845005906>",
  heart:        "<:heart:1503424887916593293>",
  brokenheart:  "<:brokenheart:1503424885534359744>",
  cloud:        "<:cloud:1490332376327389366>",
  brain:        "<:brain:1490332465250697256>",
  bell:         "<:bell:1490332309256274013>",
  horn:         "<:horn:1490332332463362078>",
  eye:          "<:eye:1490332470980378745>",
};

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────
function getCategoryMeta(key) { return DB.categories[key] || null; }
function getParts(catKey)      { return DB.parts[catKey] || {}; }

function getSortedParts(catKey) {
  const parts = getParts(catKey);
  return Object.entries(parts)
    .map(([n, p]) => ({ number: parseInt(n), ...p }))
    .sort((a, b) => a.number - b.number);
}
function partCount(catKey) { return Object.keys(getParts(catKey)).length; }

function truncate(s, max = 4000) {
  if (!s) return "";
  return s.length > max ? s.substring(0, max) + "\n*(truncated...)*" : s;
}

function isAdmin(interaction) {
  if (interaction.user.id === process.env.BOT_OWNER_ID) return true;
  if (interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (interaction.member?.roles?.cache?.some(r => r.name === "Admin")) return true;
  return false;
}

function errEmbed(msg) {
  return new EmbedBuilder()
    .setColor(0xB71C1C)
    .setTitle(`${E.hazard}  Error`)
    .setDescription(msg)
    .setFooter({ text: "unknownsubmitter" });
}
function successEmbed(title, msg) {
  return new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle(`${E.correct}  ${title}`)
    .setDescription(msg)
    .setFooter({ text: "unknownsubmitter" })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────
//  CATEGORY EMBED BUILDERS
// ─────────────────────────────────────────────────────
const CAT_COLORS = [
  0x1B5E20, 0x1A237E, 0x4A148C, 0x006064, 0x3E2723,
  0x880E4F, 0x004D40, 0x37474F, 0x6D4C41, 0x00695C,
];
function getCatColor(key) {
  const meta = getCategoryMeta(key);
  if (meta?.color) return meta.color;
  let hash = 0;
  for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return CAT_COLORS[hash % CAT_COLORS.length];
}

function categoryListEmbed(catKey, page = 0) {
  const meta  = getCategoryMeta(catKey);
  const parts = getSortedParts(catKey);
  const PER   = 15;
  const totalPages = Math.max(1, Math.ceil(parts.length / PER));
  const slice = parts.slice(page * PER, (page + 1) * PER);

  const embed = new EmbedBuilder()
    .setColor(getCatColor(catKey))
    .setTitle(`${meta?.name || catKey}`)
    .setFooter({ text: `unknownsubmitter  •  Page ${page + 1}/${totalPages}  •  ${parts.length} part(s)` })
    .setTimestamp();

  if (meta?.description) embed.setDescription(`*${meta.description}*\n\u200b`);

  if (!slice.length) {
    embed.addFields({ name: "No parts yet", value: "Use `/addpart` to add content.", inline: false });
  } else {
    const lines = slice.map(p => `**Part ${p.number}** — ${p.title || "*Untitled*"}`).join("\n");
    embed.addFields({ name: `${E.folder}  Parts`, value: lines, inline: false });
  }
  return { embed, totalPages };
}

function partEmbed(catKey, partNum) {
  const meta  = getCategoryMeta(catKey);
  const parts = getParts(catKey);
  const part  = parts[partNum];
  if (!part) return null;
  return new EmbedBuilder()
    .setColor(getCatColor(catKey))
    .setAuthor({ name: `${meta?.name || catKey}  •  Part ${partNum}` })
    .setTitle(part.title || `Part ${partNum}`)
    .setDescription(truncate(part.content || "*No content.*"))
    .setFooter({ text: `unknownsubmitter  •  ${partCount(catKey)} parts total` })
    .setTimestamp();
}

function allCategoriesEmbed() {
  const cats  = Object.entries(DB.categories);
  const embed = new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle("All Categories")
    .setFooter({ text: `unknownsubmitter  •  ${cats.length} categories` })
    .setTimestamp();

  if (!cats.length) {
    embed.setDescription("No categories yet. Use `/createcategory` to get started.");
    return embed;
  }
  const lines = cats.map(([key, meta]) => {
    const count = partCount(key);
    const badge = meta.static ? " *(static)*" : "";
    return `${E.folder} **${meta.name}**${badge} — \`/${key}\` — **${count}** part(s)\n*${meta.description || "No description."}*`;
  });
  embed.setDescription(lines.join("\n\n"));
  return embed;
}

// ─────────────────────────────────────────────────────
//  NAVIGATION BUTTONS
// ─────────────────────────────────────────────────────
function listNavBtns(catKey, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`lp_${catKey}_${page - 1}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`ln_${catKey}_${page + 1}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    new ButtonBuilder().setCustomId(`lr_${catKey}`).setLabel("Back").setStyle(ButtonStyle.Primary),
  );
}
function partNavBtns(catKey, partNum) {
  const parts = getSortedParts(catKey);
  const idx   = parts.findIndex(p => p.number === partNum);
  const prev  = parts[idx - 1]?.number ?? null;
  const next  = parts[idx + 1]?.number ?? null;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pp_${catKey}_${prev}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary).setDisabled(prev === null),
    new ButtonBuilder().setCustomId(`pn_${catKey}_${next}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary).setDisabled(next === null),
    new ButtonBuilder().setCustomId(`pb_${catKey}_0`).setLabel("All Parts").setStyle(ButtonStyle.Primary),
  );
}

// ═══════════════════════════════════════════════════════════════
//  INFO COMMAND EMBEDS
// ═══════════════════════════════════════════════════════════════

function islamEmbed() {
  return new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle("What is Islam?")
    .setDescription(
      "**Islam** (الإسلام) is the religion of absolute submission and obedience to Allah — the One True God.\n\n" +
      "It is not a new religion. It is the same message brought by every prophet from Adam ﷺ to Muhammad ﷺ: " +
      "**worship Allah alone and follow His guidance.**"
    )
    .addFields(
      {
        name: `${E.brain}  The Word "Islam"`,
        value:
          "Derived from the Arabic root **س-ل-م** (S-L-M), which carries the meanings of:\n" +
          "**Salaam** — Peace\n" +
          "**Istislaam** — Submission & surrender\n" +
          "**Salamah** — Safety and wholeness\n\n" +
          "True peace is found in submitting fully to the will of Allah.",
        inline: false,
      },
      {
        name: `${E.book}  From the Quran`,
        value:
          "**إِنَّ الدِّينَ عِندَ اللَّهِ الْإِسْلَامُ**\n" +
          "*\"Indeed, the religion in the sight of Allah is Islam.\"*\n— (Aal Imran 3:19)",
        inline: false,
      },
      {
        name: `${E.stars}  What does it mean to be Muslim?`,
        value:
          "A Muslim submits their will, desires, and life entirely to Allah — not out of compulsion, but out of love, " +
          "knowledge, and conviction. Every aspect of life — worship, family, business, character — is guided by the " +
          "Quran and the Sunnah of the Prophet ﷺ.",
        inline: false,
      },
      {
        name: `${E.correct}  The Five Pillars`,
        value: "Shahadah • Salah • Zakah • Sawm • Hajj\nUse `/pillarsofislam` for full details.",
        inline: true,
      },
      {
        name: `${E.correct}  The Six Pillars of Iman`,
        value: "Allah • Angels • Books • Messengers • Last Day • Qadar\nUse `/pillarsofiman` for full details.",
        inline: true,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  \"And I did not create the jinn and mankind except to worship Me.\" (51:56)" })
    .setTimestamp();
}

function muslimEmbed() {
  return new EmbedBuilder()
    .setColor(0x0D47A1)
    .setTitle("What is a Muslim?")
    .setDescription(
      "A **Muslim** (مُسْلِم) is one who submits entirely to Allah — who surrenders their will, actions, " +
      "and life to the Creator of the heavens and the earth."
    )
    .addFields(
      {
        name: `${E.brain}  The Word "Muslim"`,
        value:
          "From the same root as Islam — **س-ل-م** (S-L-M).\n" +
          "**Muslim** literally means *\"one who submits\"* or *\"one who surrenders to Allah.\"*\n\n" +
          "A Muslim is one who:\n" +
          "• Believes in the Shahadah with the heart\n" +
          "• Declares it with the tongue\n" +
          "• Acts upon it with the limbs",
        inline: false,
      },
      {
        name: `${E.book}  From the Quran`,
        value:
          "**وَمَنْ أَحْسَنُ دِينًا مِّمَّنْ أَسْلَمَ وَجْهَهُ لِلَّهِ وَهُوَ مُحْسِنٌ**\n" +
          "*\"And who is better in religion than one who submits his face to Allah while being a doer of good.\"*\n— (An-Nisa 4:125)",
        inline: false,
      },
      {
        name: `${E.stars}  Rights of a Muslim upon Another`,
        value:
          "The Prophet ﷺ said:\n" +
          "*\"The Muslim has five rights over his fellow Muslim: returning the salaam, visiting the sick, following the " +
          "funeral, accepting the invitation, and saying Yarhamukallah when he sneezes.\"*\n— (Bukhari & Muslim)",
        inline: false,
      },
      {
        name: `${E.heart}  Brotherhood in Islam`,
        value:
          "**إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ**\n" +
          "*\"The believers are but brothers.\"* — (Al-Hujurat 49:10)\n\n" +
          "Race, nationality, and language are irrelevant — every Muslim is your brother or sister in faith.",
        inline: false,
      },
      {
        name: `${E.idea}  Muslim vs Mumin`,
        value:
          "**Muslim** — one who has submitted outwardly and inwardly.\n" +
          "**Mumin** — a Believer whose Iman has penetrated deep into the heart.\n" +
          "Every Mumin is a Muslim, but the station of Iman is higher than mere outward submission. (Al-Hujurat 49:14)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  All Muslims are one Ummah" })
    .setTimestamp();
}

function pillarsOfIslamEmbed() {
  return new EmbedBuilder()
    .setColor(0x006064)
    .setTitle("The Five Pillars of Islam")
    .setDescription(
      "*\"Islam has been built upon five things.\"*\n— Prophet Muhammad ﷺ (Bukhari & Muslim)\n\n" +
      "These are the foundational acts of worship every Muslim must uphold."
    )
    .addFields(
      {
        name: `${E.correct}  1. Shahadah — Declaration of Faith`,
        value:
          "**أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ**\n" +
          "*\"I bear witness that there is no god but Allah, and that Muhammad is the Messenger of Allah.\"*\n\n" +
          "The entry point into Islam. Use `/shahadah` for full explanation.",
        inline: false,
      },
      {
        name: `${E.correct}  2. Salah — Prayer`,
        value:
          "5 daily prayers: Fajr, Dhuhr, Asr, Maghrib, Isha.\n" +
          "A direct connection between the servant and Allah. Use `/salah` for full breakdown.",
        inline: false,
      },
      {
        name: `${E.correct}  3. Zakah — Obligatory Charity`,
        value:
          "2.5% of qualifying wealth given annually to those in need.\n" +
          "Purifies wealth, the soul, and strengthens the community. Use `/zakah` for full breakdown.",
        inline: false,
      },
      {
        name: `${E.correct}  4. Sawm — Fasting Ramadan`,
        value:
          "Fasting the month of Ramadan from Fajr to Maghrib.\n" +
          "A month of worship, patience, and gratitude. Use `/sawm` for full breakdown.",
        inline: false,
      },
      {
        name: `${E.correct}  5. Hajj — Pilgrimage`,
        value:
          "Pilgrimage to Makkah once in a lifetime for those who are physically and financially able.\n" +
          "Use `/hajj` for full breakdown.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Source: Sahih al-Bukhari & Muslim" })
    .setTimestamp();
}

function pillarsOfImanEmbed() {
  return new EmbedBuilder()
    .setColor(0x3E2723)
    .setTitle("The Six Pillars of Iman")
    .setDescription(
      "*\"Iman is to believe in Allah, His angels, His books, His messengers, the Last Day, and to believe in " +
      "divine decree — both the good and the bad thereof.\"*\n— (Hadith of Jibreel, Sahih Muslim)"
    )
    .addFields(
      {
        name: `${E.stars}  1. Belief in Allah`,
        value:
          "Believing in His existence, Oneness (Tawheed), names, and attributes.\n" +
          "He has no partners, no equals, no offspring, and nothing resembles Him.\n" +
          "Use `/tawheedtypes` for a full breakdown.",
        inline: false,
      },
      {
        name: `${E.stars}  2. Belief in the Angels`,
        value:
          "Angels are created from light, they do not disobey Allah, and carry out His commands.\n" +
          "Notable: Jibreel (revelation), Mika'eel (provisions), Israfeel (Trumpet), " +
          "Munkar & Nakeer (the grave), Malik (Keeper of Hellfire).",
        inline: false,
      },
      {
        name: `${E.stars}  3. Belief in the Divine Books`,
        value:
          "Tawrah (Torah) — Musa ﷺ\n" +
          "Injeel (Gospel) — Isa ﷺ\n" +
          "Zabur (Psalms) — Dawud ﷺ\n" +
          "Suhuf — Ibrahim ﷺ\n" +
          "Al-Quran — Muhammad ﷺ (the final, preserved revelation)",
        inline: false,
      },
      {
        name: `${E.stars}  4. Belief in the Messengers`,
        value:
          "From Adam ﷺ to the seal of all prophets Muhammad ﷺ — 25 are mentioned in the Quran.\n" +
          "All were humans chosen by Allah. We love, respect, and follow them all.\n" +
          "Use `/prophetnames` to learn names and titles of the Prophet ﷺ.",
        inline: false,
      },
      {
        name: `${E.stars}  5. Belief in the Last Day`,
        value:
          "Belief in: death, the grave, the resurrection, the reckoning, the Bridge (Sirat), " +
          "Jannah (Paradise), Jahannam (Hellfire).\n" +
          "*\"Every soul shall taste death.\"* — (Aal Imran 3:185)",
        inline: false,
      },
      {
        name: `${E.stars}  6. Belief in Qadar — Divine Decree`,
        value:
          "Everything that happens is within the knowledge, writing, will, and creation of Allah.\n" +
          "We make real choices — but Allah knew what we would choose before we were created.\n" +
          "Use `/qadar` for full explanation.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Source: Sahih Muslim — Hadith of Jibreel" })
    .setTimestamp();
}

function shahadahEmbed() {
  return new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle("The Shahadah — Declaration of Faith")
    .setDescription(
      "**أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ**\n\n" +
      "*\"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah.\"*"
    )
    .addFields(
      {
        name: `${E.brain}  Breaking it Down`,
        value:
          "**لَا إِلَٰهَ إِلَّا ٱللَّٰهُ** — *\"There is no god but Allah\"*\n" +
          "Negates all false deities and affirms that Allah alone deserves worship.\n\n" +
          "**مُحَمَّدٌ رَسُولُ ٱللَّٰهِ** — *\"Muhammad is the Messenger of Allah\"*\n" +
          "Affirms that we follow his way — the Sunnah — in how we worship Allah.",
        inline: false,
      },
      {
        name: `${E.book}  Seven Conditions of the Shahadah`,
        value:
          "**1.** Ilm — Knowledge of its meaning\n" +
          "**2.** Yaqeen — Certainty, no doubt\n" +
          "**3.** Ikhlas — Sincerity, purely for Allah\n" +
          "**4.** Sidq — Truthfulness from the heart\n" +
          "**5.** Mahabbah — Love of this testimony and what it demands\n" +
          "**6.** Inqiyad — Submission and compliance\n" +
          "**7.** Qabool — Acceptance, not rejection",
        inline: false,
      },
      {
        name: `${E.idea}  Why is saying it alone not enough?`,
        value:
          "Iblis (Shaytan) knows Allah exists — but he refuses to submit. Knowledge alone is not sufficient.\n" +
          "The Shahadah must be said with the **tongue**, believed with the **heart**, and acted upon with the **limbs**.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The gateway to Islam" })
    .setTimestamp();
}

function salahEmbed() {
  return new EmbedBuilder()
    .setColor(0x006064)
    .setTitle("Salah — The Five Daily Prayers")
    .setDescription(
      "*\"Indeed, prayer has been decreed upon the believers a decree of specified times.\"*\n— (An-Nisa 4:103)"
    )
    .addFields(
      { name: `${E.sun}  Fajr`,    value: "**2 rakaat** — from true dawn until just before sunrise", inline: true },
      { name: `${E.sun}  Dhuhr`,   value: "**4 rakaat** — after the sun passes its zenith", inline: true },
      { name: `${E.sun}  Asr`,     value: "**4 rakaat** — afternoon until just before sunset", inline: true },
      { name: `${E.sun}  Maghrib`, value: "**3 rakaat** — just after sunset", inline: true },
      { name: `${E.sun}  Isha`,    value: "**4 rakaat** — from disappearance of twilight", inline: true },
      { name: "\u200b",            value: "\u200b", inline: true },
      {
        name: `${E.brain}  Conditions (Shurut)`,
        value:
          "Purification (Taharah) • Facing the Qiblah • Covering the Awrah • " +
          "Prayer time having entered • Intention (Niyyah)",
        inline: false,
      },
      {
        name: `${E.correct}  Pillars (Arkan)`,
        value:
          "Standing (Qiyam) • Opening Takbeer • Reciting Al-Fatihah • Ruku (bowing) • " +
          "Rising from Ruku • Two Sujoods • Sitting between Sujoods • " +
          "Final Tashahhud • Tasleem",
        inline: false,
      },
      {
        name: `${E.book}  Virtue of Salah`,
        value:
          "*\"The first matter the slave will be brought to account for on the Day of Judgement is the prayer. " +
          "If it is sound, the rest of his deeds will be sound. If it is corrupt, the rest will be corrupt.\"*\n— (Tabarani, Sahih)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The second pillar of Islam" })
    .setTimestamp();
}

function zakahEmbed() {
  return new EmbedBuilder()
    .setColor(0x4A148C)
    .setTitle("Zakah — Obligatory Charity")
    .setDescription(
      "*\"Take from their wealth a charity by which you purify them and cause them increase.\"*\n— (At-Tawbah 9:103)"
    )
    .addFields(
      {
        name: `${E.brain}  What is Zakah?`,
        value:
          "The obligatory annual payment of **2.5%** of qualifying wealth given to eligible recipients.\n" +
          "One of the five pillars — a right of the poor over the wealthy, and an act of worship.",
        inline: false,
      },
      {
        name: `${E.correct}  Conditions`,
        value:
          "Muslim • Sane and adult • Owns the **Nisab** (minimum threshold) • " +
          "Wealth held for a **full lunar year (Hawl)**",
        inline: false,
      },
      {
        name: `${E.book}  Nisab`,
        value:
          "Equivalent to **87.48g of gold** or **612.36g of silver**.\n" +
          "If your savings exceed this for a full lunar year, Zakah is due.",
        inline: false,
      },
      {
        name: `${E.stars}  Rate`,
        value: "**2.5%** of total qualifying wealth — savings, investments, trade goods, etc.",
        inline: false,
      },
      {
        name: `${E.paper}  The 8 Recipients — (Quran 9:60)`,
        value:
          "1. The Poor (Fuqara)\n2. The Needy (Masakeen)\n3. Zakah Collectors\n" +
          "4. Those whose hearts are to be reconciled\n5. Freeing slaves\n" +
          "6. Those in debt\n7. In the way of Allah\n8. The Traveller in need",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The third pillar of Islam" })
    .setTimestamp();
}

function sawmEmbed() {
  return new EmbedBuilder()
    .setColor(0x880E4F)
    .setTitle("Sawm — Fasting Ramadan")
    .setDescription(
      "*\"O you who believe! Fasting is prescribed for you as it was prescribed for those before you, " +
      "that you may become righteous.\"*\n— (Al-Baqarah 2:183)"
    )
    .addFields(
      {
        name: `${E.brain}  What is Sawm?`,
        value:
          "Abstaining from food, drink, marital relations, and all invalidating acts from true dawn (Fajr) " +
          "until sunset (Maghrib) throughout the month of **Ramadan**.",
        inline: false,
      },
      {
        name: `${E.correct}  Conditions`,
        value:
          "Muslim • Sane • Reached puberty • Resident (not travelling) • " +
          "Free from illness • Not menstruating or in postnatal bleeding",
        inline: false,
      },
      {
        name: `${E.incorrect_x}  What invalidates the fast?`,
        value:
          "Eating or drinking intentionally • Marital relations • Intentional vomiting • " +
          "Taking nourishing injections • Menstruation or postnatal bleeding",
        inline: false,
      },
      {
        name: `${E.stars}  Laylatul Qadr — Night of Power`,
        value:
          "*\"The Night of Decree is better than a thousand months.\"* — (Al-Qadr 97:3)\n" +
          "Sought in the **last 10 nights** of Ramadan — especially the odd nights (21st, 23rd, 25th, 27th, 29th).",
        inline: false,
      },
      {
        name: `${E.heart}  Dua of Breaking Fast (Iftar)`,
        value:
          "**ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ**\n" +
          "*\"Thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.\"*\n— (Abu Dawud, Hasan)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The fourth pillar of Islam" })
    .setTimestamp();
}

function hajjEmbed() {
  return new EmbedBuilder()
    .setColor(0x3E2723)
    .setTitle("Hajj — The Pilgrimage")
    .setDescription(
      "*\"And proclaim to the people the Hajj; they will come to you on foot and on every lean camel.\"*\n— (Al-Hajj 22:27)"
    )
    .addFields(
      {
        name: `${E.brain}  What is Hajj?`,
        value:
          "The annual pilgrimage to **Makkah al-Mukarramah** — obligatory once in a lifetime " +
          "for every Muslim who is physically and financially able.",
        inline: false,
      },
      {
        name: `${E.correct}  Conditions`,
        value:
          "Muslim • Sane • Adult • Free • Physically able • Financially able " +
          "(including provision for family) • Safe route available",
        inline: false,
      },
      {
        name: `${E.book}  The Four Pillars of Hajj`,
        value:
          "**1.** Ihram — entering the sacred state\n" +
          "**2.** Wuquf at Arafah — *the heart and most essential pillar*\n" +
          "**3.** Tawaf al-Ifadah — circling the Kabah\n" +
          "**4.** Sai — walking between Safa and Marwa",
        inline: false,
      },
      {
        name: `${E.sandclock}  Key Dates (Dhul Hijjah)`,
        value:
          "**8th** — Day of Tarwiyah, travel to Mina\n" +
          "**9th** — Day of Arafah (standing — the essence of Hajj)\n" +
          "**10th** — Eid al-Adha, stoning Jamarat, sacrifice, shaving/cutting hair\n" +
          "**11th–13th** — Days of Tashreeq, remaining in Mina",
        inline: false,
      },
      {
        name: `${E.earth}  Key Sites`,
        value:
          "Masjid al-Haram • Kabah • Mina • Mount Arafah • " +
          "Muzdalifah • Jamarat • Masjid an-Nabawi (Madinah — highly recommended Sunnah visit)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The fifth pillar of Islam" })
    .setTimestamp();
}

function qadarEmbed() {
  return new EmbedBuilder()
    .setColor(0x0D47A1)
    .setTitle("Qadar — Divine Decree")
    .setDescription(
      "*\"Verily, We have created all things with Qadar.\"*\n— (Al-Qamar 54:49)"
    )
    .addFields(
      {
        name: `${E.brain}  What is Qadar?`,
        value:
          "The belief that Allah has full and eternal knowledge of everything that was, is, and will be — " +
          "that He wrote all of it in the **Preserved Tablet (Al-Lawh al-Mahfuz)** 50,000 years before creation, " +
          "that He willed it, and that He is the Creator of all things.",
        inline: false,
      },
      {
        name: `${E.correct}  The Four Levels of Qadar`,
        value:
          "**1. Al-Ilm** — Allah's eternal, all-encompassing knowledge of everything\n" +
          "**2. Al-Kitabah** — He wrote everything in the Preserved Tablet\n" +
          "**3. Al-Masheah** — Whatever He wills happens; whatever He does not will, does not happen\n" +
          "**4. Al-Khalq** — He is the Creator of all things and all actions",
        inline: false,
      },
      {
        name: `${E.book}  Does Qadar remove free will?`,
        value:
          "No. Allah gave us intellect, choice, and accountability. We make real choices — " +
          "but Allah knew what we would choose before we were created. Our choices are real; His knowledge is perfect.",
        inline: false,
      },
      {
        name: `${E.heart}  The Believer's Response to Qadar`,
        value:
          "*\"How amazing is the affair of the believer! Everything is good for him — and this is only for the believer. " +
          "If something good happens, he thanks Allah. If something bad happens, he is patient — and both are good for him.\"*\n— (Sahih Muslim)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The sixth pillar of Iman" })
    .setTimestamp();
}

function wuduEmbed() {
  return new EmbedBuilder()
    .setColor(0x006064)
    .setTitle("Wudu — Ablution")
    .setDescription(
      "*\"O you who believe! When you stand for prayer, wash your faces and your forearms to the elbows, " +
      "wipe your heads, and wash your feet to the ankles.\"*\n— (Al-Maidah 5:6)"
    )
    .addFields(
      {
        name: `${E.correct}  Obligatory Acts (Fard)`,
        value:
          "**1.** Washing the face (including mouth and nose)\n" +
          "**2.** Washing the arms up to and including the elbows\n" +
          "**3.** Wiping the head (at least a quarter)\n" +
          "**4.** Washing the feet up to and including the ankles\n" +
          "**5.** Performing these in order (Tartib)\n" +
          "**6.** Continuity (Muwalat) — no long gap between limbs",
        inline: false,
      },
      {
        name: `${E.stars}  Sunnah Acts`,
        value:
          "Starting with Bismillah • Using the miswak • Washing hands first (3x) • " +
          "Beginning with the right side • Repeating each act 3 times • Saying the dua after wudu",
        inline: false,
      },
      {
        name: `${E.incorrect_x}  What breaks Wudu?`,
        value:
          "Anything exiting the private parts (urine, stool, wind) • Deep sleep • " +
          "Loss of consciousness • Touching private parts without barrier (Shafii/Hanbali) • " +
          "Eating camel meat (Hanbali)",
        inline: false,
      },
      {
        name: `${E.heart}  Dua After Wudu`,
        value:
          "**أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ**\n" +
          "*\"I bear witness that none has the right to be worshipped but Allah alone, with no partner, " +
          "and that Muhammad is His slave and messenger.\"*\n" +
          "*(The eight gates of Jannah are opened for him — Sahih Muslim)*",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Purification is half of faith (Sahih Muslim)" })
    .setTimestamp();
}

function ghuslEmbed() {
  return new EmbedBuilder()
    .setColor(0x004D40)
    .setTitle("Ghusl — Ritual Bath")
    .setDescription(
      "*\"If you are in a state of major impurity, purify yourselves (by bathing your whole body).\"*\n— (Al-Maidah 5:6)"
    )
    .addFields(
      {
        name: `${E.book}  What requires Ghusl?`,
        value:
          "**1.** Marital relations (whether ejaculation occurs or not)\n" +
          "**2.** Ejaculation due to a wet dream or otherwise\n" +
          "**3.** End of menstruation (Hayd)\n" +
          "**4.** End of postnatal bleeding (Nifas)\n" +
          "**5.** Death (performed by others — Ghusl al-Mayyit)\n" +
          "**6.** Entering Islam (according to most scholars)",
        inline: false,
      },
      {
        name: `${E.correct}  Minimum (Fard) Ghusl`,
        value:
          "**1.** Intention (Niyyah)\n" +
          "**2.** Remove any physical impurity on the body\n" +
          "**3.** Water must reach the entire body — every part, including hair roots",
        inline: false,
      },
      {
        name: `${E.stars}  Complete Sunnah Ghusl`,
        value:
          "Wash hands 3x → Wash private parts → Make full Wudu → " +
          "Pour water over head 3x ensuring roots are wet → " +
          "Pour over right shoulder 3x → Left shoulder 3x → " +
          "Ensure water reaches entire body → Wash feet",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Source: Sahih al-Bukhari & Muslim" })
    .setTimestamp();
}

function tawheedTypesEmbed() {
  return new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle("The Three Categories of Tawheed")
    .setDescription(
      "The scholars of Ahl al-Sunnah wal-Jamaah categorise Tawheed into three essential, interconnected divisions:"
    )
    .addFields(
      {
        name: `${E.stars}  1. Tawheed al-Rububiyyah — Oneness of Lordship`,
        value:
          "Believing that Allah alone is the Creator, Sustainer, Owner, and Controller of all that exists.\n\n" +
          "Even the mushrikeen of Makkah affirmed this:\n" +
          "*\"If you ask them who created the heavens and the earth, they will say Allah.\"* — (Luqman 31:25)\n\n" +
          "Affirming this alone is **not sufficient** for salvation — it was not enough for Firaun or Abu Jahl.",
        inline: false,
      },
      {
        name: `${E.stars}  2. Tawheed al-Uluhiyyah — Oneness of Worship`,
        value:
          "Directing all acts of worship — prayer, dua, slaughter, vows, fear, hope, tawakkul, love — to **Allah alone**.\n\n" +
          "This is the core message of every prophet:\n" +
          "*\"Worship Allah; you have no deity other than Him.\"* — (Al-Araf 7:59)\n\n" +
          "This is the Tawheed the mushrikeen rejected. It is the Tawheed Islam was sent to establish.",
        inline: false,
      },
      {
        name: `${E.stars}  3. Tawheed al-Asma was-Sifat — Oneness of Names and Attributes`,
        value:
          "Affirming for Allah all the names and attributes He affirmed for Himself in the Quran and authentic Sunnah — without:\n" +
          "**Tahrif** — distorting the meaning\n" +
          "**Tatil** — denying them\n" +
          "**Takyeef** — asking how or describing the modality\n" +
          "**Tamtheel** — comparing them to the attributes of creation",
        inline: false,
      },
      {
        name: `${E.brain}  Why does this matter?`,
        value:
          "It clarifies where shirk actually occurs (primarily in al-Uluhiyyah), and protects us from " +
          "misunderstanding Allah's nature. This is the methodology of the Salaf — the pious predecessors.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Methodology of Ahl al-Sunnah wal-Jamaah" })
    .setTimestamp();
}

function islamImanIhsanEmbed() {
  return new EmbedBuilder()
    .setColor(0x37474F)
    .setTitle("Islam, Iman and Ihsan — The Three Levels of the Deen")
    .setDescription(
      "*From the Hadith of Jibreel — one of the most comprehensive hadith in all of Islam*\n— (Sahih Muslim, Hadith 8)"
    )
    .addFields(
      {
        name: `${E.book}  Islam — Submission`,
        value:
          "To testify the Shahadah, establish Salah, give Zakah, fast Ramadan, and perform Hajj if able.\n\n" +
          "*The outer, visible, physical dimension of the Deen.*",
        inline: false,
      },
      {
        name: `${E.stars}  Iman — Faith`,
        value:
          "To believe in Allah, His angels, His books, His messengers, the Last Day, and Qadar — good and bad.\n\n" +
          "*The inner, creedal, heart-based dimension of the Deen.*",
        inline: false,
      },
      {
        name: `${E.heart}  Ihsan — Excellence and Perfection`,
        value:
          "**\"To worship Allah as if you see Him — and though you do not see Him, know that He sees you.\"**\n\n" +
          "The highest level. It transforms every act — prayer, speech, business, sleep — into conscious devotion.\n\n" +
          "*The spiritual, experiential, deepest dimension of the Deen.*",
        inline: false,
      },
      {
        name: `${E.correct}  The Relationship Between the Three`,
        value:
          "Every Mumin (believer) is a Muslim — but not every Muslim has perfected Iman.\n" +
          "Every person of Ihsan has Iman — but Ihsan is rarer and higher.\n\n" +
          "*\"Iman increases with obedience and decreases with sin.\"* — (Ahl al-Sunnah consensus)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Hadith of Jibreel — Sahih Muslim" })
    .setTimestamp();
}

function prophetNamesEmbed() {
  return new EmbedBuilder()
    .setColor(0x880E4F)
    .setTitle("Names and Titles of the Prophet Muhammad")
    .setDescription(
      "*\"And We have not sent you except as a mercy to all the worlds.\"*\n— (Al-Anbya 21:107)\n\n" +
      "May Allah's peace and blessings be upon him."
    )
    .addFields(
      { name: `${E.correct}  Muhammad`,             value: "The Praised One — mentioned 4 times in the Quran", inline: true },
      { name: `${E.correct}  Ahmad`,                value: "The Most Praiseworthy — prophesied in the Injeel (As-Saf 61:6)", inline: true },
      { name: `${E.correct}  Al-Mustafa`,           value: "The Chosen One — chosen above all creation by Allah", inline: true },
      { name: `${E.correct}  Al-Amin`,              value: "The Trustworthy — title given by the Quraysh before prophethood", inline: true },
      { name: `${E.correct}  Khatam al-Nabiyyeen`,  value: "The Seal of the Prophets — the final messenger (Al-Ahzab 33:40)", inline: true },
      { name: `${E.correct}  Rahmatan lil-Alameen`, value: "A Mercy to all the Worlds — his mission is universal", inline: true },
      { name: `${E.correct}  Al-Mahi`,              value: "The Eraser — through him Allah erased disbelief", inline: true },
      { name: `${E.correct}  Al-Hashir`,            value: "The Gatherer — mankind gathers at his feet on Yawm al-Qiyamah", inline: true },
      { name: `${E.correct}  Al-Aqib`,              value: "The Last — there is no prophet after him", inline: true },
      {
        name: `${E.heart}  Sending Salah upon the Prophet`,
        value:
          "**اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ**\n" +
          "*\"O Allah, send Your peace and blessings upon Muhammad and upon the family of Muhammad.\"*\n\n" +
          "*\"Whoever sends one salah upon me, Allah sends ten upon him.\"* — (Sahih Muslim)",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  May Allah's peace and blessings be upon him" })
    .setTimestamp();
}

function islamicCalendarEmbed() {
  return new EmbedBuilder()
    .setColor(0x4E342E)
    .setTitle("The Islamic Lunar Calendar")
    .setDescription(
      "The **Hijri calendar** begins from the **migration (Hijrah) of the Prophet ﷺ** from Makkah to Madinah in **622 CE**.\n" +
      "It is a **lunar calendar** — each month begins with the sighting of the new crescent moon."
    )
    .addFields(
      { name: `${E.sandclock}  1. Muharram`,      value: "Sacred month — contains **Ashura** (10th)", inline: true },
      { name: `${E.sandclock}  2. Safar`,         value: "Second month of the Hijri year", inline: true },
      { name: `${E.sandclock}  3. Rabi al-Awwal`, value: "Birth of the Prophet ﷺ (12th)", inline: true },
      { name: `${E.sandclock}  4. Rabi al-Thani`, value: "Fourth month", inline: true },
      { name: `${E.sandclock}  5. Jumada al-Awwal`, value: "Fifth month", inline: true },
      { name: `${E.sandclock}  6. Jumada al-Thani`, value: "Sixth month", inline: true },
      { name: `${E.sandclock}  7. Rajab`,         value: "Sacred month — Isra wal Miraj (27th)", inline: true },
      { name: `${E.sandclock}  8. Shaban`,        value: "Laylatul Baraa (15th) — deeds raised to Allah", inline: true },
      { name: `${E.sandclock}  9. Ramadan`,       value: "Month of fasting — Laylatul Qadr (last 10 nights)", inline: true },
      { name: `${E.sandclock}  10. Shawwal`,      value: "**Eid al-Fitr** (1st) — 6 fasts of Shawwal are Sunnah", inline: true },
      { name: `${E.sandclock}  11. Dhul Qadah`,   value: "Sacred month — preparation for Hajj", inline: true },
      { name: `${E.sandclock}  12. Dhul Hijjah`,  value: "Sacred month — **Hajj** (8-13th), **Eid al-Adha** (10th)", inline: true },
      {
        name: `${E.stars}  The Four Sacred Months`,
        value:
          "**Muharram, Rajab, Dhul Qadah, Dhul Hijjah**\n" +
          "Sins are weightier and worship is more rewarded in these months.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  The Hijri Calendar" })
    .setTimestamp();
}

function sunnahPrayersEmbed() {
  return new EmbedBuilder()
    .setColor(0x006064)
    .setTitle("Sunnah and Voluntary Prayers")
    .setDescription(
      "Beyond the 5 obligatory prayers, the Prophet ﷺ regularly performed additional prayers — " +
      "each bringing one closer to Allah."
    )
    .addFields(
      {
        name: `${E.correct}  Rawatib Sunnah — Regular Sunnah Prayers`,
        value:
          "**2 before Fajr** (most emphasised — more beloved to the Prophet ﷺ than the dunya and all it contains)\n" +
          "**4 before Dhuhr** + **2 after Dhuhr**\n" +
          "**2 after Maghrib**\n" +
          "**2 after Isha**",
        inline: false,
      },
      {
        name: `${E.stars}  Tahajjud — Night Prayer`,
        value:
          "Prayed in the **last third of the night** — the most virtuous voluntary prayer.\n\n" +
          "*\"Our Lord descends to the lowest heaven in the last third of every night and says: " +
          "Who is calling upon Me that I may answer? Who is asking of Me that I may give?\"*\n— (Bukhari & Muslim)\n\n" +
          "Minimum: 2 rakaat — Maximum: 8 rakaat before Witr",
        inline: false,
      },
      {
        name: `${E.correct}  Witr`,
        value:
          "Prayed after Isha — 1, 3, 5, 7, or 9 rakaat. Highly emphasised — the Prophet ﷺ never abandoned it.\n" +
          "Dua al-Qunut is recited in the last rakaat.",
        inline: false,
      },
      {
        name: `${E.sun}  Salat ad-Duha`,
        value:
          "Prayed after sunrise (approx. 20 min after) until before Dhuhr.\n" +
          "Minimum: 2 rakaat — Maximum: 12 rakaat\n\n" +
          "*\"Whoever prays Fajr in congregation then sits remembering Allah until sunrise, then prays 2 rakaat — " +
          "he will have the reward of a complete Hajj and Umrah.\"*\n— (Tirmidhi, Hasan)",
        inline: false,
      },
      {
        name: `${E.correct}  Salat al-Jumuah — Friday Prayer`,
        value:
          "Obligatory upon Muslim men — replaces Dhuhr. 2 rakaat after the khutbah.\n\n" +
          "*\"There is an hour on Friday where any Muslim who stands in prayer and asks Allah for something — " +
          "Allah will surely grant it.\"*\n— (Bukhari & Muslim)\n" +
          "Most likely: the last hour before Maghrib.",
        inline: false,
      },
    )
    .setFooter({ text: "unknownsubmitter  •  Voluntary prayers draw one closer to Allah" })
    .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════
//  BUILD SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════
function buildCommands() {
  const catChoices = Object.keys(DB.categories).map(k => ({
    name: DB.categories[k].name, value: k,
  }));

  const INFO_CMDS = new Set([
    "islam","muslim",
    "pillarsofislam","pillarsofiman",
    "shahadah","salah","zakah","sawm","hajj",
    "qadar","wudu","ghusl",
    "tawheedtypes","islamimanihsan",
    "prophetnames","islamiccalendar","sunnahprayers",
  ]);

  const cmds = [
    // ── Info commands ──────────────────────────────────────────
    new SlashCommandBuilder().setName("islam").setDescription("What is Islam? Meaning, definition, and overview"),
    new SlashCommandBuilder().setName("muslim").setDescription("What is a Muslim? Meaning and what it entails"),
    new SlashCommandBuilder().setName("pillarsofislam").setDescription("The Five Pillars of Islam — full reference card"),
    new SlashCommandBuilder().setName("pillarsofiman").setDescription("The Six Pillars of Iman — full reference card"),
    new SlashCommandBuilder().setName("shahadah").setDescription("The Shahadah — meaning, breakdown, and 7 conditions"),
    new SlashCommandBuilder().setName("salah").setDescription("Salah — the five daily prayers, conditions, and pillars"),
    new SlashCommandBuilder().setName("zakah").setDescription("Zakah — obligatory charity, nisab, and 8 recipients"),
    new SlashCommandBuilder().setName("sawm").setDescription("Sawm — fasting Ramadan, conditions, and Laylatul Qadr"),
    new SlashCommandBuilder().setName("hajj").setDescription("Hajj — the pilgrimage, pillars, and key dates"),
    new SlashCommandBuilder().setName("qadar").setDescription("Qadar — Divine Decree and its four levels"),
    new SlashCommandBuilder().setName("wudu").setDescription("Wudu — ablution steps, conditions, and what breaks it"),
    new SlashCommandBuilder().setName("ghusl").setDescription("Ghusl — ritual bath, what requires it, and how to perform it"),
    new SlashCommandBuilder().setName("tawheedtypes").setDescription("The Three Categories of Tawheed explained"),
    new SlashCommandBuilder().setName("islamimanihsan").setDescription("Islam, Iman and Ihsan — the three levels of the Deen"),
    new SlashCommandBuilder().setName("prophetnames").setDescription("Names and titles of the Prophet Muhammad"),
    new SlashCommandBuilder().setName("islamiccalendar").setDescription("The Islamic Hijri calendar — all 12 months and key dates"),
    new SlashCommandBuilder().setName("sunnahprayers").setDescription("Sunnah and voluntary prayers — Tahajjud, Witr, Duha, Rawatib"),

    // ── Admin: Category CRUD ────────────────────────────────────
    new SlashCommandBuilder()
      .setName("createcategory").setDescription("Create a new category [Admin]")
      .addStringOption(o => o.setName("name").setDescription("Category key (lowercase, no spaces)").setRequired(true))
      .addStringOption(o => o.setName("display").setDescription("Display name e.g. Seerah").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Short description").setRequired(false))
      .addStringOption(o => o.setName("emoji").setDescription("Emoji for this category").setRequired(false)),

    new SlashCommandBuilder()
      .setName("deletecategory").setDescription("Delete a category and all its parts [Admin]")
      .addStringOption(o => o.setName("name").setDescription("Category key to delete").setRequired(true)
        .addChoices(...catChoices.slice(0, 25))),

    new SlashCommandBuilder()
      .setName("renamecategory").setDescription("Rename a category [Admin]")
      .addStringOption(o => o.setName("old").setDescription("Current category key").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addStringOption(o => o.setName("new").setDescription("New display name").setRequired(true)),

    new SlashCommandBuilder().setName("listcategories").setDescription("Show all categories with part counts"),

    // ── Part Management ─────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("addpart").setDescription("Add a part to a category [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName("title").setDescription("Part title").setRequired(true))
      .addStringOption(o => o.setName("content").setDescription("Part content (max 1000 chars here; use /editpart for more)").setRequired(true)),

    new SlashCommandBuilder()
      .setName("editpart").setDescription("Edit a part via interactive modal [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("deletepart").setDescription("Delete a specific part [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("insertpart").setDescription("Insert a part and shift subsequent numbers up [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Insert at this number (shifts others up)").setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName("title").setDescription("Part title").setRequired(true))
      .addStringOption(o => o.setName("content").setDescription("Part content").setRequired(true)),

    new SlashCommandBuilder()
      .setName("movepart").setDescription("Move a part to a new number [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("from").setDescription("Current part number").setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName("to").setDescription("New part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("listparts").setDescription("List all parts in a category")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true).addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("page").setDescription("Page number").setMinValue(1)),
  ];

  // Dynamic category commands — skip any that collide with info cmds
  for (const [key, meta] of Object.entries(DB.categories)) {
    if (INFO_CMDS.has(key)) continue;
    cmds.push(
      new SlashCommandBuilder()
        .setName(key)
        .setDescription(`${meta.name} — browse parts`)
        .addIntegerOption(o => o.setName("part").setDescription("Part number (omit to list all)").setMinValue(1))
    );
  }

  return cmds.map(c => c.toJSON());
}

// ═══════════════════════════════════════════════════════════════
//  CLIENT
// ═══════════════════════════════════════════════════════════════
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands() {
  if (!process.env.DISCORD_TOKEN) return;
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  try {
    const body = buildCommands();
    const app  = await rest.get(Routes.currentApplication());
    await rest.put(Routes.applicationCommands(app.id), { body });
    console.log(`✓ Registered ${body.length} commands`);
  } catch (e) {
    console.error("Command registration failed:", e);
  }
}

client.once("ready", async () => {
  console.log(`✓ Bot ready: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "/islam /pillarsofislam /pillarsofiman", type: 3 }],
    status: "idle",
  });
  await registerCommands();
});

// ═══════════════════════════════════════════════════════════════
//  INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════
client.on("interactionCreate", async interaction => {

  // ── MODAL SUBMIT ──────────────────────────────────────────────
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("editpart_modal_")) {
      const parts  = interaction.customId.split("_");
      const num    = parseInt(parts[parts.length - 1]);
      const catKey = parts.slice(2, parts.length - 1).join("_");
      const title   = interaction.fields.getTextInputValue("title");
      const content = interaction.fields.getTextInputValue("content");

      if (!DB.parts[catKey]) DB.parts[catKey] = {};
      DB.parts[catKey][num] = { title, content };
      saveData(DB);

      await interaction.reply({
        embeds: [successEmbed("Part Updated", `**Part ${num}** in **${DB.categories[catKey]?.name || catKey}** has been updated.`)],
        ephemeral: true,
      });
    }
    return;
  }

  // ── BUTTONS ───────────────────────────────────────────────────
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id.startsWith("lp_") || id.startsWith("ln_")) {
      await interaction.deferUpdate();
      const p      = id.split("_");
      const catKey = p[1];
      const page   = parseInt(p[2]);
      const { embed, totalPages } = categoryListEmbed(catKey, page);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, page, totalPages)] });
      return;
    }
    if (id.startsWith("lr_")) {
      await interaction.deferUpdate();
      const catKey = id.slice(3);
      const { embed, totalPages } = categoryListEmbed(catKey, 0);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, 0, totalPages)] });
      return;
    }
    if (id.startsWith("pp_") || id.startsWith("pn_")) {
      await interaction.deferUpdate();
      const [, catKey, numStr] = id.split("_");
      const num   = parseInt(numStr);
      const embed = partEmbed(catKey, num);
      if (!embed) return interaction.editReply({ embeds: [errEmbed("Part not found.")] });
      await interaction.editReply({ embeds: [embed], components: [partNavBtns(catKey, num)] });
      return;
    }
    if (id.startsWith("pb_")) {
      await interaction.deferUpdate();
      const p      = id.split("_");
      const catKey = p[1];
      const page   = parseInt(p[2]) || 0;
      const { embed, totalPages } = categoryListEmbed(catKey, page);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, page, totalPages)] });
      return;
    }
    return;
  }

  // ── SLASH COMMANDS ────────────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;

  // Info commands
  if (cmd === "islam")           return interaction.reply({ embeds: [islamEmbed()] });
  if (cmd === "muslim")          return interaction.reply({ embeds: [muslimEmbed()] });
  if (cmd === "pillarsofislam")  return interaction.reply({ embeds: [pillarsOfIslamEmbed()] });
  if (cmd === "pillarsofiman")   return interaction.reply({ embeds: [pillarsOfImanEmbed()] });
  if (cmd === "shahadah")        return interaction.reply({ embeds: [shahadahEmbed()] });
  if (cmd === "salah")           return interaction.reply({ embeds: [salahEmbed()] });
  if (cmd === "zakah")           return interaction.reply({ embeds: [zakahEmbed()] });
  if (cmd === "sawm")            return interaction.reply({ embeds: [sawmEmbed()] });
  if (cmd === "hajj")            return interaction.reply({ embeds: [hajjEmbed()] });
  if (cmd === "qadar")           return interaction.reply({ embeds: [qadarEmbed()] });
  if (cmd === "wudu")            return interaction.reply({ embeds: [wuduEmbed()] });
  if (cmd === "ghusl")           return interaction.reply({ embeds: [ghuslEmbed()] });
  if (cmd === "tawheedtypes")    return interaction.reply({ embeds: [tawheedTypesEmbed()] });
  if (cmd === "islamimanihsan")  return interaction.reply({ embeds: [islamImanIhsanEmbed()] });
  if (cmd === "prophetnames")    return interaction.reply({ embeds: [prophetNamesEmbed()] });
  if (cmd === "islamiccalendar") return interaction.reply({ embeds: [islamicCalendarEmbed()] });
  if (cmd === "sunnahprayers")   return interaction.reply({ embeds: [sunnahPrayersEmbed()] });

  // createcategory
  if (cmd === "createcategory") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const rawKey  = interaction.options.getString("name").toLowerCase().replace(/\s+/g, "");
    const display = interaction.options.getString("display");
    const desc    = interaction.options.getString("description") || "";
    const emoji   = interaction.options.getString("emoji") || "";
    if (DB.categories[rawKey])
      return interaction.reply({ embeds: [errEmbed(`Category \`${rawKey}\` already exists.`)], ephemeral: true });
    if (!/^[a-z0-9]+$/.test(rawKey))
      return interaction.reply({ embeds: [errEmbed("Category key must be lowercase letters/digits only.")], ephemeral: true });
    DB.categories[rawKey] = { name: display, color: 0x00695C, emoji, description: desc, static: false };
    DB.parts[rawKey]      = {};
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Category Created", `**${display}** (\`/${rawKey}\`) is ready.\nUse \`/addpart\` to populate it.`)] });
    await registerCommands();
    return;
  }

  // deletecategory
  if (cmd === "deletecategory") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key = interaction.options.getString("name");
    if (!DB.categories[key])
      return interaction.reply({ embeds: [errEmbed(`Category \`${key}\` not found.`)], ephemeral: true });
    if (DB.categories[key].static)
      return interaction.reply({ embeds: [errEmbed(`\`${key}\` is a static category and cannot be deleted.`)], ephemeral: true });
    const name = DB.categories[key].name;
    delete DB.categories[key];
    delete DB.parts[key];
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Category Deleted", `**${name}** has been removed.`)] });
    await registerCommands();
    return;
  }

  // renamecategory
  if (cmd === "renamecategory") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key     = interaction.options.getString("old");
    const newName = interaction.options.getString("new");
    if (!DB.categories[key])
      return interaction.reply({ embeds: [errEmbed(`Category \`${key}\` not found.`)], ephemeral: true });
    DB.categories[key].name = newName;
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Category Renamed", `\`/${key}\` is now displayed as **${newName}**.`)] });
    await registerCommands();
    return;
  }

  // listcategories
  if (cmd === "listcategories") return interaction.reply({ embeds: [allCategoriesEmbed()] });

  // addpart
  if (cmd === "addpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key     = interaction.options.getString("category");
    const num     = interaction.options.getInteger("number");
    const title   = interaction.options.getString("title");
    const content = interaction.options.getString("content");
    if (!DB.parts[key]) DB.parts[key] = {};
    if (DB.parts[key][num])
      return interaction.reply({ embeds: [errEmbed(`Part **${num}** already exists. Use \`/editpart\` to update it, or \`/insertpart\` to shift parts.`)], ephemeral: true });
    DB.parts[key][num] = { title, content };
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Part Added", `**Part ${num}** added to **${DB.categories[key]?.name || key}**.\n\n**${title}**\n${truncate(content, 300)}`)] });
    return;
  }

  // editpart
  if (cmd === "editpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key      = interaction.options.getString("category");
    const num      = interaction.options.getInteger("number");
    const existing = DB.parts[key]?.[num] || {};
    const modal = new ModalBuilder()
      .setCustomId(`editpart_modal_${key}_${num}`)
      .setTitle(`Edit: ${DB.categories[key]?.name || key} — Part ${num}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("title").setLabel("Title")
          .setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true).setValue(existing.title || "")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("content").setLabel("Content")
          .setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true).setValue(existing.content || "")
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  // deletepart
  if (cmd === "deletepart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key = interaction.options.getString("category");
    const num = interaction.options.getInteger("number");
    if (!DB.parts[key]?.[num])
      return interaction.reply({ embeds: [errEmbed(`Part **${num}** not found in **${DB.categories[key]?.name || key}**.`)], ephemeral: true });
    const title = DB.parts[key][num].title;
    delete DB.parts[key][num];
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Part Deleted", `**Part ${num}** (*${title}*) has been removed from **${DB.categories[key]?.name || key}**.`)] });
    return;
  }

  // insertpart
  if (cmd === "insertpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key     = interaction.options.getString("category");
    const at      = interaction.options.getInteger("number");
    const title   = interaction.options.getString("title");
    const content = interaction.options.getString("content");
    if (!DB.parts[key]) DB.parts[key] = {};
    const sorted = getSortedParts(key).filter(p => p.number >= at).reverse();
    for (const p of sorted) DB.parts[key][p.number + 1] = { title: p.title, content: p.content };
    DB.parts[key][at] = { title, content };
    saveData(DB);
    await interaction.reply({ embeds: [successEmbed("Part Inserted", `**Part ${at}** inserted into **${DB.categories[key]?.name || key}**.\nParts ${at + 1}+ have been shifted up accordingly.`)] });
    return;
  }

  // movepart
  if (cmd === "movepart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });
    const key  = interaction.options.getString("category");
    const from = interaction.options.getInteger("from");
    const to   = interaction.options.getInteger("to");
    if (!DB.parts[key]?.[from])
      return interaction.reply({ embeds: [errEmbed(`Part **${from}** not found.`)], ephemeral: true });
    if (from === to)
      return interaction.reply({ embeds: [errEmbed("Source and destination are the same.")], ephemeral: true });
    const part = DB.parts[key][from];
    delete DB.parts[key][from];
    if (DB.parts[key][to]) {
      const displaced     = DB.parts[key][to];
      DB.parts[key][to]   = part;
      DB.parts[key][from] = displaced;
      saveData(DB);
      await interaction.reply({ embeds: [successEmbed("Parts Swapped", `Part **${from}** (*${part.title}*) swapped with Part **${to}** (*${displaced.title}*)`)] });
    } else {
      DB.parts[key][to] = part;
      saveData(DB);
      await interaction.reply({ embeds: [successEmbed("Part Moved", `Part **${from}** (*${part.title}*) moved to **Part ${to}**.`)] });
    }
    return;
  }

  // listparts
  if (cmd === "listparts") {
    const key  = interaction.options.getString("category");
    const page = (interaction.options.getInteger("page") || 1) - 1;
    const { embed, totalPages } = categoryListEmbed(key, page);
    await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [listNavBtns(key, page, totalPages)] : [] });
    return;
  }

  // Dynamic category command
  if (DB.categories[cmd]) {
    const partNum = interaction.options.getInteger("part");
    if (partNum !== null && partNum !== undefined) {
      const embed = partEmbed(cmd, partNum);
      if (!embed)
        return interaction.reply({ embeds: [errEmbed(`Part **${partNum}** not found in **${DB.categories[cmd].name}**.\nUse \`/${cmd}\` to see all available parts.`)] });
      await interaction.reply({ embeds: [embed], components: [partNavBtns(cmd, partNum)] });
    } else {
      const { embed, totalPages } = categoryListEmbed(cmd, 0);
      await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [listNavBtns(cmd, 0, totalPages)] : [] });
    }
    return;
  }

  await interaction.reply({ embeds: [errEmbed("Unknown command.")], ephemeral: true });
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════
if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN not set in .env");
  process.exit(1);
}
client.login(process.env.DISCORD_TOKEN);
