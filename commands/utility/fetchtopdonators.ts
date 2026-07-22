// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("fetchtopdonators")
    .setDescription("Displays the top 10 donors by XP.")
    .addNumberOption((option) =>
      option
        .setName("entity")
        .setDescription("The entity to fetch top donors for")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("exclude-nochar")
        .setDescription("Exclude users who have not donated with a character (pre-char update) (default: false)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const entities = await sendDBRequest("xpDonationEntities", "findMany", {});
    const choices = entities.map((entity: any) => ({
      name: entity.entityName,
      value: Number(entity.id),
    }));
    const filtered = choices.filter((choice: { name: string }) =>
      choice.name.startsWith(focusedValue)
    );
    await interaction.respond(filtered);
  },
  async execute(interaction: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const entity = interaction.options.getNumber("entity");
    if (!entity) {
      return interaction.reply({
        content: "Invalid input.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const excludeNoChar = interaction.options.getBoolean("exclude-nochar");
    const whereClause = excludeNoChar
      ? {
          entityId: entity,
          NOT: {
            character: null,
          },
        }
      : {
          entityId: entity,
        };

    const topUsers = await sendDBRequest("xpDonationLog", "groupBy", {
      by: ["userId"],
      where: whereClause,
      _sum: { xpDonated: true },
      orderBy: {
        _sum: { xpDonated: "desc" },
      },
      take: 10,
    });

    if (!topUsers || topUsers.length === 0) {
      return interaction.followUp({
        content: "No users found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const playerIds = topUsers.map((user: any) => user.userId);
    const players = await sendDBRequest("players", "findMany", {
      where: {
        id: {
          in: playerIds,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const playersById: Map<string, any> = new Map(
      players.map((player: any) => [player.id.toString(), player])
    );

    const leaderboard = topUsers
      .map((user: any, index: number) => {
        const playerInfo: any = playersById.get(user.userId.toString());
        const discordUser = playerInfo?.userId ? `<@${playerInfo.userId}>` : "Unknown user";

          return `${index + 1}. ${discordUser} - xp donated: ${user._sum.xpDonated || 0}`;
      })
      .join("\n");
    await interaction.followUp({
      content: `**Top 10 Donors by XP:**\n${leaderboard}`});
  },
};
