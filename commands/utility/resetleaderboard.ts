// Licensed under CC BY 4.0
// © Massimiliano Biondi, 2025
// https://creativecommons.org/licenses/by/4.0/
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import database from "../../singletons/database";

export default {
	data: new SlashCommandBuilder()
		.setName('resetleaderboard')
		.setDescription('Resets the XP leaderboard.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction: any) {
		await database.userXp.deleteMany({});
		await interaction.reply({ content: "XP leaderboard has been reset.", flags: MessageFlags.Ephemeral });
	},
};