/**
 * ═══════════════════════════════════════════════════════════════
 *   UNKNOWNSUBMITTER — Islamic Knowledge Bot
 * ═══════════════════════════════════════════════════════════════
 *
 *  Static Categories: tawheed (38), aqeedah, rulings,
 *                     pillarsofislam, pillarsofiman
 *  Dynamic Categories: CRUD via admin commands
 *  Part Management: add, edit, delete, insert, move, list
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
//  PERSISTENCE  (JSON file-based)
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
//  STATIC CATEGORIES  (seeded on first run)
// ─────────────────────────────────────────────────────
const STATIC_CATEGORIES = {
  tawheed:        { name: "Tawheed",          color: 0x1B5E20, emoji: "📖", description: "The Oneness of Allah — the foundation of Islam" },
  aqeedah:        { name: "Aqeedah",          color: 0x1A237E, emoji: "🌙", description: "Islamic Creed & Belief" },
  rulings:        { name: "Rulings",          color: 0x4A148C, emoji: "⚖️", description: "Islamic Jurisprudence & Rulings" },
  pillarsofislam: { name: "Pillars of Islam", color: 0x006064, emoji: "🕌", description: "The Five Pillars of Islam" },
  pillarsofiman:  { name: "Pillars of Iman",  color: 0x3E2723, emoji: "✨", description: "The Six Pillars of Faith" },
};

// Seed static categories into DB if they don't exist yet
for (const [key, meta] of Object.entries(STATIC_CATEGORIES)) {
  if (!DB.categories[key]) {
    DB.categories[key] = { ...meta, static: true };
    DB.parts[key] = {};
  }
}
saveData(DB);

// ─────────────────────────────────────────────────────
//  CUSTOM EMOJIS
// ─────────────────────────────────────────────────────
const E = {
  book:    "<:book:1505332214051766384>",
  pin:     "<:pin:1505332838030114927>",
  pencil:  "<:pencil:1505332155482640495>",
  folder:  "<:folder:1505332121982603275>",
  trash:   "<:trash:1505332205369430126>",
  correct: "<:correct:1490332296086163676>",
  hazard:  "<:hazard:1490332614845005906>",
  stars:   "<:stars:1505332605426466937>",
  idea:    "<:idea:1505332431027310632>",
  settings:"<:settings:1505332485511319633>",
  brain:   "<:brain:1490332465250697256>",
  paper:   "<:paper:1490332319221809313>",
  link:    "<:link:1490332324762484940>",
  message: "<:message:1505332064814370847>",
  magnify: "<:magnifyingglass:1505332144162209873>",
  sun:     "<:sun:1505332915821613149>",
  leaf:    "<:leaf:1490332343918006402>",
  heart:   "<:heart:1503424887916593293>",
  key:     "<:key:1490332311965667469>",
  lock:    "<:lock:1490332316957016316>",
};

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────
function getCategoryMeta(key) {
  return DB.categories[key] || null;
}

function getParts(catKey) {
  return DB.parts[catKey] || {};
}

function getSortedParts(catKey) {
  const parts = getParts(catKey);
  return Object.entries(parts)
    .map(([n, p]) => ({ number: parseInt(n), ...p }))
    .sort((a, b) => a.number - b.number);
}

function partCount(catKey) {
  return Object.keys(getParts(catKey)).length;
}

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
//  EMBED BUILDERS
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

/** Embed showing all parts in a category */
function categoryListEmbed(catKey, page = 0) {
  const meta  = getCategoryMeta(catKey);
  const parts = getSortedParts(catKey);
  const PER   = 15;
  const totalPages = Math.max(1, Math.ceil(parts.length / PER));
  const slice = parts.slice(page * PER, (page + 1) * PER);

  const embed = new EmbedBuilder()
    .setColor(getCatColor(catKey))
    .setTitle(`${meta?.emoji || E.book}  ${meta?.name || catKey}`)
    .setFooter({ text: `unknownsubmitter  •  Page ${page + 1}/${totalPages}  •  ${parts.length} part(s)` })
    .setTimestamp();

  if (meta?.description) embed.setDescription(`*${meta.description}*\n\u200b`);

  if (!slice.length) {
    embed.addFields({ name: "No parts yet", value: "Use `/addpart` to add content.", inline: false });
  } else {
    const lines = slice.map(p =>
      `**Part ${p.number}** — ${p.title || "*Untitled*"}`
    ).join("\n");
    embed.addFields({ name: `${E.folder}  Parts`, value: lines, inline: false });
  }

  return { embed, totalPages };
}

/** Embed showing a single part */
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

/** All-categories overview embed */
function allCategoriesEmbed() {
  const cats = Object.entries(DB.categories);
  const embed = new EmbedBuilder()
    .setColor(0x1B5E20)
    .setTitle(`${E.folder}  All Categories`)
    .setFooter({ text: `unknownsubmitter  •  ${cats.length} categories` })
    .setTimestamp();

  if (!cats.length) {
    embed.setDescription("No categories yet. Use `/createcategory` to get started.");
    return embed;
  }

  const lines = cats.map(([key, meta]) => {
    const count = partCount(key);
    const badge = meta.static ? " *(static)*" : "";
    return `${meta.emoji || E.book} **${meta.name}**${badge} — \`/${key}\` — **${count}** part(s)\n*${meta.description || "No description."}*`;
  });

  embed.setDescription(lines.join("\n\n"));
  return embed;
}

// ─────────────────────────────────────────────────────
//  NAVIGATION BUTTONS
// ─────────────────────────────────────────────────────
function listNavBtns(catKey, page, totalPages) {
  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`lp_${catKey}_${page - 1}`)
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`ln_${catKey}_${page + 1}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`lr_${catKey}`)
      .setLabel("↩ Back")
      .setStyle(ButtonStyle.Primary),
  );
  return row;
}

function partNavBtns(catKey, partNum) {
  const parts = getSortedParts(catKey);
  const idx   = parts.findIndex(p => p.number === partNum);
  const prev  = parts[idx - 1]?.number ?? null;
  const next  = parts[idx + 1]?.number ?? null;

  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`pp_${catKey}_${prev}`)
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(prev === null),
    new ButtonBuilder()
      .setCustomId(`pn_${catKey}_${next}`)
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(next === null),
    new ButtonBuilder()
      .setCustomId(`pb_${catKey}_0`)
      .setLabel("≡ All Parts")
      .setStyle(ButtonStyle.Primary),
  );
  return row;
}

// ═══════════════════════════════════════════════════════════════
//  BUILD SLASH COMMANDS (dynamic — rebuilt on register)
// ═══════════════════════════════════════════════════════════════
function buildCommands() {
  const catChoices = Object.keys(DB.categories).map(k => ({
    name: DB.categories[k].name, value: k,
  }));

  const cmds = [
    // ── Admin: Category CRUD ──────────────────────────────────
    new SlashCommandBuilder()
      .setName("createcategory")
      .setDescription("Create a new category [Admin]")
      .addStringOption(o => o.setName("name").setDescription("Category key (lowercase, no spaces)").setRequired(true))
      .addStringOption(o => o.setName("display").setDescription("Display name e.g. Seerah").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Short description").setRequired(false))
      .addStringOption(o => o.setName("emoji").setDescription("Emoji for this category").setRequired(false)),

    new SlashCommandBuilder()
      .setName("deletecategory")
      .setDescription("Delete a category and all its parts [Admin]")
      .addStringOption(o => o.setName("name").setDescription("Category key to delete").setRequired(true)
        .addChoices(...catChoices.slice(0, 25))),

    new SlashCommandBuilder()
      .setName("renamecategory")
      .setDescription("Rename a category [Admin]")
      .addStringOption(o => o.setName("old").setDescription("Current category key").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addStringOption(o => o.setName("new").setDescription("New display name").setRequired(true)),

    new SlashCommandBuilder()
      .setName("listcategories")
      .setDescription("Show all categories with part counts"),

    // ── Part Management ────────────────────────────────────────
    new SlashCommandBuilder()
      .setName("addpart")
      .setDescription("Add a part to a category [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName("title").setDescription("Part title").setRequired(true))
      .addStringOption(o => o.setName("content").setDescription("Part content (max 1000 chars here; use /editpart for more)").setRequired(true)),

    new SlashCommandBuilder()
      .setName("editpart")
      .setDescription("Edit a part via interactive modal [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("deletepart")
      .setDescription("Delete a specific part [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("insertpart")
      .setDescription("Insert a part and shift subsequent numbers up [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("number").setDescription("Insert at this number (shifts others up)").setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName("title").setDescription("Part title").setRequired(true))
      .addStringOption(o => o.setName("content").setDescription("Part content").setRequired(true)),

    new SlashCommandBuilder()
      .setName("movepart")
      .setDescription("Move a part to a new number [Admin]")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("from").setDescription("Current part number").setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName("to").setDescription("New part number").setRequired(true).setMinValue(1)),

    new SlashCommandBuilder()
      .setName("listparts")
      .setDescription("List all parts in a category")
      .addStringOption(o => o.setName("category").setDescription("Category").setRequired(true)
        .addChoices(...catChoices.slice(0, 25)))
      .addIntegerOption(o => o.setName("page").setDescription("Page number").setMinValue(1)),
  ];

  // ── Dynamic category commands (one per category) ─────────────
  for (const [key, meta] of Object.entries(DB.categories)) {
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
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

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
    activities: [{ name: "/tawheed /aqeedah /pillarsofislam", type: 3 }],
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
      const [,, catKey, numStr] = interaction.customId.split("_");
      const num     = parseInt(numStr);
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

    // List pagination: lp_catKey_page / ln_catKey_page
    if (id.startsWith("lp_") || id.startsWith("ln_")) {
      await interaction.deferUpdate();
      const parts  = id.split("_");
      const catKey = parts[1];
      const page   = parseInt(parts[2]);
      const { embed, totalPages } = categoryListEmbed(catKey, page);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, page, totalPages)] });
      return;
    }

    // Back to list: lr_catKey
    if (id.startsWith("lr_")) {
      await interaction.deferUpdate();
      const catKey = id.slice(3);
      const { embed, totalPages } = categoryListEmbed(catKey, 0);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, 0, totalPages)] });
      return;
    }

    // Part prev/next: pp_catKey_partNum / pn_catKey_partNum
    if (id.startsWith("pp_") || id.startsWith("pn_")) {
      await interaction.deferUpdate();
      const [, catKey, numStr] = id.split("_");
      const num   = parseInt(numStr);
      const embed = partEmbed(catKey, num);
      if (!embed) return interaction.editReply({ embeds: [errEmbed("Part not found.")] });
      await interaction.editReply({ embeds: [embed], components: [partNavBtns(catKey, num)] });
      return;
    }

    // Back to list from part: pb_catKey_page
    if (id.startsWith("pb_")) {
      await interaction.deferUpdate();
      const parts  = id.split("_");
      const catKey = parts[1];
      const page   = parseInt(parts[2]) || 0;
      const { embed, totalPages } = categoryListEmbed(catKey, page);
      await interaction.editReply({ embeds: [embed], components: [listNavBtns(catKey, page, totalPages)] });
      return;
    }
    return;
  }

  // ── SLASH COMMANDS ────────────────────────────────────────────
  if (!interaction.isChatInputCommand()) return;

  const cmd    = interaction.commandName;
  const catKey = cmd; // category commands are named after their key

  // ── createcategory ────────────────────────────────────────────
  if (cmd === "createcategory") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });

    const rawKey  = interaction.options.getString("name").toLowerCase().replace(/\s+/g, "");
    const display = interaction.options.getString("display");
    const desc    = interaction.options.getString("description") || "";
    const emoji   = interaction.options.getString("emoji") || E.book;

    if (DB.categories[rawKey])
      return interaction.reply({ embeds: [errEmbed(`Category \`${rawKey}\` already exists.`)], ephemeral: true });

    // Validate key (letters/digits only)
    if (!/^[a-z0-9]+$/.test(rawKey))
      return interaction.reply({ embeds: [errEmbed("Category key must be lowercase letters/digits only (no spaces or symbols).")], ephemeral: true });

    DB.categories[rawKey] = { name: display, color: 0x00695C, emoji, description: desc, static: false };
    DB.parts[rawKey]      = {};
    saveData(DB);

    await interaction.reply({ embeds: [successEmbed("Category Created", `**${display}** (\`/${rawKey}\`) is ready.\nUse \`/addpart\` to populate it.`)] });
    await registerCommands();
    return;
  }

  // ── deletecategory ────────────────────────────────────────────
  if (cmd === "deletecategory") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });

    const key = interaction.options.getString("name");
    if (!DB.categories[key])
      return interaction.reply({ embeds: [errEmbed(`Category \`${key}\` not found.`)], ephemeral: true });
    if (DB.categories[key].static)
      return interaction.reply({ embeds: [errEmbed(`\`${key}\` is a static category and cannot be deleted. You can remove all its parts with \`/deletepart\`.`)], ephemeral: true });

    const name = DB.categories[key].name;
    delete DB.categories[key];
    delete DB.parts[key];
    saveData(DB);

    await interaction.reply({ embeds: [successEmbed("Category Deleted", `**${name}** has been removed.`)] });
    await registerCommands();
    return;
  }

  // ── renamecategory ────────────────────────────────────────────
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

  // ── listcategories ────────────────────────────────────────────
  if (cmd === "listcategories") {
    return interaction.reply({ embeds: [allCategoriesEmbed()] });
  }

  // ── addpart ───────────────────────────────────────────────────
  if (cmd === "addpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });

    const key     = interaction.options.getString("category");
    const num     = interaction.options.getInteger("number");
    const title   = interaction.options.getString("title");
    const content = interaction.options.getString("content");

    if (!DB.parts[key]) DB.parts[key] = {};
    if (DB.parts[key][num])
      return interaction.reply({ embeds: [errEmbed(`Part **${num}** already exists in **${DB.categories[key]?.name || key}**. Use \`/editpart\` to update it, or \`/insertpart\` to shift parts.`)], ephemeral: true });

    DB.parts[key][num] = { title, content };
    saveData(DB);

    await interaction.reply({ embeds: [successEmbed("Part Added", `**Part ${num}** added to **${DB.categories[key]?.name || key}**.\n\n**${title}**\n${truncate(content, 300)}`)] });
    return;
  }

  // ── editpart ──────────────────────────────────────────────────
  if (cmd === "editpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });

    const key = interaction.options.getString("category");
    const num = interaction.options.getInteger("number");

    const existing = DB.parts[key]?.[num] || {};

    const modal = new ModalBuilder()
      .setCustomId(`editpart_modal_${key}_${num}`)
      .setTitle(`Edit: ${DB.categories[key]?.name || key} — Part ${num}`);

    const titleInput = new TextInputBuilder()
      .setCustomId("title")
      .setLabel("Title")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(true)
      .setValue(existing.title || "");

    const contentInput = new TextInputBuilder()
      .setCustomId("content")
      .setLabel("Content")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(true)
      .setValue(existing.content || "");

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(contentInput),
    );

    await interaction.showModal(modal);
    return;
  }

  // ── deletepart ────────────────────────────────────────────────
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

  // ── insertpart ────────────────────────────────────────────────
  if (cmd === "insertpart") {
    if (!isAdmin(interaction))
      return interaction.reply({ embeds: [errEmbed("You need **Admin** permission.")], ephemeral: true });

    const key     = interaction.options.getString("category");
    const at      = interaction.options.getInteger("number");
    const title   = interaction.options.getString("title");
    const content = interaction.options.getString("content");

    if (!DB.parts[key]) DB.parts[key] = {};

    // Shift all parts >= at upward
    const sorted = getSortedParts(key).filter(p => p.number >= at).reverse();
    for (const p of sorted) {
      DB.parts[key][p.number + 1] = { title: p.title, content: p.content };
    }

    DB.parts[key][at] = { title, content };
    saveData(DB);

    await interaction.reply({ embeds: [successEmbed("Part Inserted", `**Part ${at}** inserted into **${DB.categories[key]?.name || key}**.\nParts ${at + 1}+ have been shifted up accordingly.`)] });
    return;
  }

  // ── movepart ──────────────────────────────────────────────────
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
      // Swap
      const displaced = DB.parts[key][to];
      DB.parts[key][to]   = part;
      DB.parts[key][from] = displaced;
      saveData(DB);
      await interaction.reply({ embeds: [successEmbed("Parts Swapped", `Part **${from}** (*${part.title}*) ↔ Part **${to}** (*${displaced.title}*)`)] });
    } else {
      DB.parts[key][to] = part;
      saveData(DB);
      await interaction.reply({ embeds: [successEmbed("Part Moved", `Part **${from}** (*${part.title}*) moved to **Part ${to}**.`)] });
    }
    return;
  }

  // ── listparts ─────────────────────────────────────────────────
  if (cmd === "listparts") {
    const key  = interaction.options.getString("category");
    const page = (interaction.options.getInteger("page") || 1) - 1;
    const { embed, totalPages } = categoryListEmbed(key, page);
    await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [listNavBtns(key, page, totalPages)] : [] });
    return;
  }

  // ── DYNAMIC CATEGORY COMMAND (e.g. /tawheed, /aqeedah, etc.) ─
  if (DB.categories[catKey]) {
    const partNum = interaction.options.getInteger("part");

    if (partNum !== null && partNum !== undefined) {
      // Show specific part
      const embed = partEmbed(catKey, partNum);
      if (!embed)
        return interaction.reply({ embeds: [errEmbed(`Part **${partNum}** not found in **${DB.categories[catKey].name}**.\nUse \`/${catKey}\` to see all available parts.`)] });
      await interaction.reply({ embeds: [embed], components: [partNavBtns(catKey, partNum)] });
    } else {
      // Show list of all parts
      const { embed, totalPages } = categoryListEmbed(catKey, 0);
      await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [listNavBtns(catKey, 0, totalPages)] : [] });
    }
    return;
  }

  // Unknown command fallback
  await interaction.reply({ embeds: [errEmbed("Unknown command.")], ephemeral: true });
});

// ═══════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════
if (!process.env.DISCORD_TOKEN) {
  console.error("❌  DISCORD_TOKEN not set in .env");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
