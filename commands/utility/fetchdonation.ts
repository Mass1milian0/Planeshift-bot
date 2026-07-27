// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { sendDBRequest } from "../../singletons/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("fetchdonations")
    .setDescription(
      "Displays how much XP has a character donated to which entity.",
    )
    .addNumberOption((option) =>
      option
        .setName("character")
        .setDescription("The character to fetch donations for.")
        .setRequired(true)
        .setAutocomplete(true),
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
    const characterId = interaction.options.getNumber("character");
    if (!characterId) {
      return interaction.reply({
        content: "Invalid input.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const donations = await sendDBRequest("xpDonationLog", "findMany", {
      where: {
        character: characterId
      },
      include: {
        xpDonationEntities: true,
        characters: {
            select: {
                name: true,
            },
        }
      },
    });

    if (!donations || donations.length === 0) {
      return interaction.reply({
        content: "No donations found for this character.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const donationList = donations
      .map(
        (donation: any) =>
          `- ${donation.xpDonationEntities.entityName}: ${donation.xpDonated} XP`,
      )
      .join("\n");

    await interaction.reply({
      content: `**Donations for ${donations[0].characters.name}:**\n${donationList}`,
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
