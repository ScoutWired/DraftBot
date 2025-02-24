import {DraftBotEmbed} from "../../core/messages/DraftBotEmbed";
import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {Translations} from "../../core/Translations";
import {ICommand} from "../ICommand";
import {replyErrorMessage} from "../../core/utils/ErrorUtils";
import {draftBotClient} from "../../core/bot";
import {EffectsConstants} from "../../core/constants/EffectsConstants";
import {Constants} from "../../core/Constants";
import {SlashCommandBuilderGenerator} from "../SlashCommandBuilderGenerator";
import Player, {Players} from "../../core/database/game/models/Player";
import {PetEntities} from "../../core/database/game/models/PetEntity";
import {Pets} from "../../core/database/game/models/Pet";

/**
 * Displays information about a pet
 * @param {CommandInteraction} interaction
 * @param {("fr"|"en")} language - Language to use in the response
 * @param player
 */
async function executeCommand(interaction: CommandInteraction, language: string, player: Player): Promise<void> {
	let askedPlayer = await Players.getByOptions(interaction);
	if (!askedPlayer) { // No entity found using the options
		askedPlayer = player;
	}
	const tr = Translations.getModule("commands.pet", language);
	const pet = await PetEntities.getById(askedPlayer.petId);
	if (pet) {
		const petModel = await Pets.getById(pet.petId);
		await interaction.reply({
			embeds: [new DraftBotEmbed()
				.formatAuthor(tr.get("embedTitle"), interaction.user, draftBotClient.users.cache.get(askedPlayer.discordUserId))
				.setDescription(
					pet.getPetDisplay(petModel, language)
				)]
		});
		return;
	}

	if (askedPlayer.discordUserId === interaction.user.id) {
		await replyErrorMessage(
			interaction,
			language,
			tr.get("noPet")
		);
	}
	else {
		await replyErrorMessage(
			interaction,
			language,
			tr.get("noPetOther")
		);
	}
}

const currentCommandFrenchTranslations = Translations.getModule("commands.pet", Constants.LANGUAGE.FRENCH);
const currentCommandEnglishTranslations = Translations.getModule("commands.pet", Constants.LANGUAGE.ENGLISH);
export const commandInfo: ICommand = {
	slashCommandBuilder: SlashCommandBuilderGenerator.generateBaseCommand(currentCommandFrenchTranslations, currentCommandEnglishTranslations)
		.addUserOption(option =>
			SlashCommandBuilderGenerator.generateUserOption(
				currentCommandFrenchTranslations, currentCommandEnglishTranslations, option
			).setRequired(false)
		)
		.addIntegerOption(option =>
			SlashCommandBuilderGenerator.generateRankOption(
				currentCommandFrenchTranslations, currentCommandEnglishTranslations, option
			).setRequired(false)
		) as SlashCommandBuilder,
	executeCommand,
	requirements: {
		disallowEffects: [EffectsConstants.EMOJI_TEXT.BABY, EffectsConstants.EMOJI_TEXT.DEAD]
	},
	mainGuildCommand: false
};
