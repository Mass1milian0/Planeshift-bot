// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { sendDBRequest } from "../../singletons/database.ts";


export default {
	data: new SlashCommandBuilder()
		.setName('fetchxp')
		.setDescription('Fetches the XP of a user together with their rank.'),
	async execute(interaction: any) {
		const userId = interaction.user.id;
		const userXP = await sendDBRequest("userXp", "findUnique", { where: { userId } });

		if (!userXP) {
			return interaction.reply({ content: "You still do not have any XP.", flags: MessageFlags.Ephemeral });
		}

		await interaction.reply({ content: `You have ${userXP.xp} XP. Your rank is: ${userXP.rank}`, flags: MessageFlags.Ephemeral });
	},
};