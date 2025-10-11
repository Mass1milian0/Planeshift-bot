// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import database from "../../singletons/database";
import { sendUpdate } from "../../singletons/worker";

export default {
  data: new SlashCommandBuilder()
    .setName("threshold")
    .setDescription("used to create or update XP thresholds")
    .addStringOption((option) =>
      option
        .setName("thresholdsrank")
        .setDescription("rank of the threshold (e.g. '1', '2', '3')")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("xprequired")
        .setDescription(
          "the experience points required to reach this threshold (integer only)"
        )
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("xpgiven")
        .setDescription(
          "the experience points given upon reaching this threshold (integer only)"
        )
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const rank = interaction.options.getString("thresholdsrank");
    const xpRequired = interaction.options.getNumber("xprequired");
    const xpGiven = interaction.options.getNumber("xpgiven");
    await database.thresholds.upsert({
      where: { tier: Number(rank) },
      create: {
        tier: Number(rank),
        xpRequired: Number(xpRequired),
        xpGiven: Number(xpGiven),
      },
      update: { xpRequired: Number(xpRequired), xpGiven: Number(xpGiven) },
    });
    await interaction.reply({
      content: `Threshold for rank ${rank} set to ${xpRequired} XP.`,
      flags: MessageFlags.Ephemeral,
    });
    sendUpdate();
  },
};
