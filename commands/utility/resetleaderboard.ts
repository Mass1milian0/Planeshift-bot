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