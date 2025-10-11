// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import database from "../../singletons/database";
import { sendUpdate } from "../../singletons/worker";

export default {
  data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("sets current channel to blacklist")
    .addBooleanOption((option) =>
      option
        .setName("toggle")
        .setDescription("Toggle blacklist status")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const bk = await database.channelBlacklist.upsert({
      where: { channelId: interaction.channelId },
      create: { channelId: interaction.channelId },
      update: { blacklisted: interaction.options.getBoolean("toggle") },
    });
    if (bk.blacklisted) {
      await interaction.reply({
        content: "Channel has been blacklisted.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "Channel has been unblacklisted.",
        flags: MessageFlags.Ephemeral,
      });
    }
    sendUpdate();
  },
};
