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
    const topUsers = await sendDBRequest("xpDonationLog", "groupBy", {
      by: ["userId"],
      where: {
        entityId: entity,
      },
      _sum: { xpDonated: true },
      orderBy: {
        _sum: { xpDonated: "desc" },
      },
      take: 10,
    });

    if (!topUsers || topUsers.length === 0) {
      return interaction.reply({
        content: "No users found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const leaderboard = topUsers
      .map((user: any, index: number) => {
        return `${index + 1}. <@${user.userId}> - xp donated: ${
          user._sum.xpDonated || 0
        }`;
      })
      .join("\n");
    await interaction.followUp({
      content: `**Top 10 Donors by XP:**\n${leaderboard}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
