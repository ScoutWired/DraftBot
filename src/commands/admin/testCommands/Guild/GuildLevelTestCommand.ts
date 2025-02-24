import Guild from "../../../../core/database/game/models/Guild";
import {format} from "../../../../core/utils/StringFormatter";
import {CommandInteraction} from "discord.js";
import {Constants} from "../../../../core/Constants";
import {ITestCommand} from "../../../../core/CommandsTest";
import {Players} from "../../../../core/database/game/models/Player";
import {GuildConstants} from "../../../../core/constants/GuildConstants";

export const commandInfo: ITestCommand = {
	name: "guildlevel",
	aliases: ["glvl"],
	commandFormat: "<level>",
	typeWaited: {
		level: Constants.TEST_VAR_TYPES.INTEGER
	},
	messageWhenExecuted: "Votre guilde est maintenant niveau {level} !",
	description: "Mets le niveau de votre guilde au niveau donné",
	commandTestShouldReply: true,
	execute: null // Defined later
};

/**
 * Set your guild's level to the given integer
 * @param {("fr"|"en")} language - Language to use in the response
 * @param interaction
 * @param {String[]} args=[] - Additional arguments sent with the command
 * @return {String} - The successful message formatted
 */
const guildLevelTestCommand = async (language: string, interaction: CommandInteraction, args: string[]): Promise<string> => {
	const [player] = await Players.getOrRegister(interaction.user.id);
	const guild = await Guild.findOne({where: {id: player.guildId}});
	if (guild === null) {
		throw new Error("Erreur glvl : vous n'êtes pas dans une guilde !");
	}
	const guildLvl = parseInt(args[0], 10);
	if (guildLvl <= 0 || guildLvl > GuildConstants.MAX_LEVEL) {
		throw new Error(`Erreur glvl : niveau de guilde invalide ! Fourchette de niveau compris entre 0 et ${GuildConstants.MAX_LEVEL}.`);
	}
	guild.level = guildLvl;
	await guild.save();
	return format(commandInfo.messageWhenExecuted, {level: args[0]});
};

commandInfo.execute = guildLevelTestCommand;