// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import database from "../../singletons/database";

export default {
  data: new SlashCommandBuilder()
    .setName("sethoneypotchannel")
    .setDescription("sets a channel which the bot will overwatch as honeypot channel")
    .addChannelOption((option) =>
      option
        .setName("honeypotchannel")
        .setDescription("sets the channel which the bot will overwatch as honeypot channel")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: any) {
    const honeypotChannel = interaction.options.getChannel("honeypotchannel");
    if (!honeypotChannel || !honeypotChannel.isTextBased()) {
      return interaction.reply({
        content: "Invalid channel selected.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await database.botConfig.update({
      where: { id: 1 },
      data: { honeypotChannel: honeypotChannel.id },
    });
    await interaction.reply({
      content: "Bot configuration updated successfully.",
      flags: MessageFlags.Ephemeral,
    });
  },
};
