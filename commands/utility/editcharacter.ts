// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("editcharacter")
    .setDescription("Edits an existing character for the user.")
    .addNumberOption((option) =>
      option
        .setName("characterid")
        .setDescription("The ID of the character to edit.")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("newcharactername")
        .setDescription("The new name of the character."),
    )
    .addBooleanOption((option) =>
      option
        .setName("enabled")
        .setDescription("Whether the character is enabled or not."),
    ),
  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    const filtered = await autocompleteCharacters(
      focusedValue,
      interaction.user.id,
    );
    await interaction.respond(filtered);
  },
  async execute(interaction: any) {
    let data: any = {};
    if (interaction.options.getString("newcharactername")) {
      data.name = interaction.options.getString("newcharactername");
    }
    if (
      interaction.options.getBoolean("enabled") ||
      interaction.options.getBoolean("enabled") === false
    ) {
      data.enabled = interaction.options.getBoolean("enabled");
    }
    await sendDBRequest("characters", "update", {
      where: {
        id: interaction.options.getNumber("characterid"),
        players: {
          userId: interaction.user.id,
        },
      },
      data: data,
    });
    await interaction.reply({
      content: `Character updated successfully.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

async function autocompleteCharacters(focusedValue: any, userId: any) {
  const characters = await sendDBRequest("characters", "findMany", {
    where: {
      players: {
        userId: userId,
      },
    },
  });
  const choices = characters.map((character: any) => ({
    name: character.name,
    value: Number(character.id),
  }));
  const filtered = choices.filter((choice: { name: string }) =>
    choice.name.startsWith(focusedValue),
  );
  //as a invalid choice, add a choice to tell the user to register a character if they can't find their character
  filtered.push({
    name: "Can't see the name of your character? run /registerCharacter.",
    value: -1,
  });
  return filtered;
}
