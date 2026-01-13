// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("fetchentitiestotals")
    .setDescription("Retrieves the current XP totals for all entities.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const entityTotals = await sendDBRequest(
      "xpDonationEntities",
      "findMany",
      {}
    );
    if (!entityTotals || entityTotals.length === 0) {
      return interaction.reply({
        content: "No entities found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    //reply with the totals for EACH entity
    const entityMessages = entityTotals.map((entity: any) => {
      const totalXP = entity.totalXp || 0;
      return `Total XP for ${entity.entityName}: ${totalXP} xp`;
    });

    await interaction.reply({
      content: entityMessages.join("\n"),
      flags: MessageFlags.Ephemeral,
    });
  },
};
