// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/

import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { sendDBRequest } from "../../singletons/database.ts";


export default {
	data: new SlashCommandBuilder()
		.setName('fetchtop')
		.setDescription('Displays the top 10 users by XP.'),
	async execute(interaction: any) {
		const topUsers = await sendDBRequest("userXp", "findMany", {
			orderBy: { xp: 'desc' },
			take: 10
		});

		if (!topUsers || topUsers.length === 0) {
			return interaction.reply({ content: "No users found.", flags: MessageFlags.Ephemeral });
		}

		const leaderboard = topUsers.map((user: any, index: number) => {
			return `${index + 1}. <@${user.userId}> - rank: ${user.rank || 0} - ${user.xp} XP`;
		}).join("\n");

		await interaction.reply({ content: `**Top 10 Users by XP:**\n${leaderboard}`, flags: MessageFlags.Ephemeral });
	},
};