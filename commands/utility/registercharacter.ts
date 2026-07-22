// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { sendDBRequest } from "../../singletons/database.ts";


export default {
	data: new SlashCommandBuilder()
		.setName('registercharacter')
		.setDescription('Registers a new character for the user.')
        .addStringOption((option) =>
            option
                .setName('charactername')
                .setDescription('The name of the character to register.')
                .setRequired(true)
        ),
	async execute(interaction: any) {
		const playerId = await sendDBRequest("players", "findFirst", {
            where: {
                userId: interaction.user.id,
            },
        });

		if (!playerId) {
			//register the character
            await sendDBRequest("players", "create", {
                data: {
                    userId: interaction.user.id,
                },
            });
		}
        //register the character name into the database in the characters table
        try{
            await sendDBRequest("characters", "create", {
                data: {
                    name: interaction.options.getString('charactername'),
                    player: playerId ? playerId.id : undefined,
                },
            });
            await interaction.reply({ content: `Character ${interaction.options.getString('charactername')} registered successfully!`, flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error("Error registering character:", error);
            await interaction.reply({ content: `Failed to register character, report this to M1S0.`, flags: MessageFlags.Ephemeral });
        }
	}
};