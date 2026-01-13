// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

function parseDdMmYyyy(input: string): Date | null {
  // expected: dd-mm-yyyy
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(input.trim());
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  // Construct in UTC to avoid local timezone shifting dates unexpectedly
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0, 0));

  // Validate round-trip (catches 31-02-2025 etc.)
  if (
    d.getUTCFullYear() !== yyyy ||
    d.getUTCMonth() !== mm - 1 ||
    d.getUTCDate() !== dd
  ) {
    return null;
  }
  return d;
}

function endOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName("fetchuserxplog")
    .setDescription("Retrieves the XP donation log for a specific user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to fetch the XP log for")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription(
          "the filter options to apply, execute /filterhelp for more info"
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const filter = interaction.options.getString("filter");
    const user = interaction.options.getUser("user");

    const filterOptions: Record<string, string> = {};
    if (filter) {
      const filterParts = filter.split(" ").filter(Boolean);
      for (const part of filterParts) {
        const [key, value] = part.split(":");
        if (!key || value == null) continue;

        switch (key) {
          case "f":
            filterOptions.from = value;
            break;
          case "t":
            filterOptions.to = value;
            break;
          case "g":
            filterOptions.greaterThan = value;
            break;
          case "l":
            filterOptions.lessThan = value;
            break;
        }
      }
    }

    // --- Build Prisma where clause ---
    // Adjust these field names to match your schema:
    // - userId: the user to fetch logs for
    // - created_at: datetime field
    // - xpDonated: numeric field
    const where: any = {
      userId: user.id,
    };

    // Date filters
    if (filterOptions.from || filterOptions.to) {
      const created_at: any = {};

      if (filterOptions.from) {
        const from = parseDdMmYyyy(filterOptions.from);
        if (!from) {
          await interaction.reply({
            content: `Invalid **from** date format: \`${filterOptions.from}\`. Use dd-mm-yyyy (e.g. 05-01-2026).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        created_at.gte = from;
      }

      if (filterOptions.to) {
        const toStart = parseDdMmYyyy(filterOptions.to);
        if (!toStart) {
          await interaction.reply({
            content: `Invalid **to** date format: \`${filterOptions.to}\`. Use dd-mm-yyyy (e.g. 12-01-2026).`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        // inclusive to-date: end of that day
        created_at.lte = endOfUtcDay(toStart);
      }

      where.created_at = created_at;
    }

    // Numeric filters (xpDonated)
    if (filterOptions.greaterThan || filterOptions.lessThan) {
      const xpDonated: any = {};

      if (filterOptions.greaterThan) {
        const g = Number(filterOptions.greaterThan);
        if (!Number.isFinite(g)) {
          await interaction.reply({
            content: `Invalid **greater-than** value: \`${filterOptions.greaterThan}\`. Use an integer.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        xpDonated.gte = g;
      }

      if (filterOptions.lessThan) {
        const l = Number(filterOptions.lessThan);
        if (!Number.isFinite(l)) {
          await interaction.reply({
            content: `Invalid **less-than** value: \`${filterOptions.lessThan}\`. Use an integer.`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        xpDonated.lte = l;
      }

      where.xpDonated = xpDonated;
    }

    const rows = await sendDBRequest("xpDonationLog", "findMany", {
      where,
      orderBy: { created_at: "desc" },
      take: 20,
    });

    const lines = rows.map((row: any) => {
      const d =
        row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at);
      const unix = Math.floor(d.getTime() / 1000); // seconds
      return `• <t:${unix}:f>: **${row.xpDonated}**XP - ${row.messageLink}`;
    });

    await interaction.reply({
      content: rows?.length
        ? `Found **${
            rows.length
          }** entries for ${user} (showing up to 20):\n${lines.join("\n")}`
        : `No entries found for ${user} with those filters.`,
    });
  },
};
