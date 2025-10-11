// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import database from "../../singletons/database";
import {sendUpdate} from "../../singletons/worker";

export default {
  data: new SlashCommandBuilder()
    .setName("ignorechar")
    .setDescription("used for character award type configuration, ignores certain characters (letters)")
    .addStringOption((option) =>
      option
        .setName("ignoredcharacters")
        .setDescription("Comma-separated list of characters to ignore")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("remove")
        .setDescription("Whether to remove the specified characters from the ignore list (false by default)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),  
  async execute(interaction: any) {
    const ignoredCharacters = interaction.options.getString("ignoredcharacters");
    const ignoredCharactersArray = ignoredCharacters.split(",").map((char : string) => char.trim());
    for (const char of ignoredCharactersArray) {
        const remove = interaction.options.getBoolean("remove") || false;
        if (remove) {
            await database.ignoredCharacters.update({
                where: { ignoredChar: char },
                data: { ignored: false },
            });
        }else{
            await database.ignoredCharacters.upsert({
                where: { ignoredChar: char },
                create: { ignoredChar: char },
                update: { ignored: true },
            });
        }
    }
    await interaction.reply({ content: "Ignored characters updated successfully.", flags: MessageFlags.Ephemeral });
    sendUpdate();
  }
};
