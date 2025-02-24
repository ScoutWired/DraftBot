import {ICommand} from "./ICommand";
import {Constants} from "../core/Constants";
import {SlashCommandBuilder} from "@discordjs/builders";
import {CommandInteraction} from "discord.js";
import {TranslationModule, Translations} from "../core/Translations";
import {replyErrorMessage} from "../core/utils/ErrorUtils";
import {DraftBotEmbed} from "../core/messages/DraftBotEmbed";
import Player, {Players} from "../core/database/game/models/Player";
import {getIdFromMention, isAMention} from "../core/utils/StringUtils";
import {sendNotificationToPlayer} from "../core/utils/MessageUtils";

/**
 * Special class for mass editing player values (admin only)
 */
export class ChangeValueAdminCommands {
	/**
	 * Get the commandInfo from the given commandName
	 * @param commandName
	 * @param editFunction
	 */
	static getCommandInfo(commandName: string, editFunction: (playerToEdit: Player, amount: number, interaction: CommandInteraction, language: string) => void): ICommand {
		const executeCommand = this.executeCommandFrom(commandName, editFunction);
		const currentCommandFrenchTranslations = Translations.getModule(`commands.${commandName}`, Constants.LANGUAGE.FRENCH);
		const currentCommandEnglishTranslations = Translations.getModule(`commands.${commandName}`, Constants.LANGUAGE.ENGLISH);
		return {
			slashCommandBuilder: new SlashCommandBuilder()
				.setName(currentCommandEnglishTranslations.get("commandName"))
				.setNameLocalizations({
					fr: currentCommandFrenchTranslations.get("commandName")
				})
				.setDescription(currentCommandEnglishTranslations.get("commandDescription"))
				.setDescriptionLocalizations({
					fr: currentCommandFrenchTranslations.get("commandDescription")
				})
				.addStringOption(option => option.setName("mode")
					.setDescription("Add / Set")
					.setRequired(true)
					.addChoices(
						{name: "Add", value: "add"},
						{name: "Set", value: "set"}
					)
				)
				.addIntegerOption(option => option.setName("amount")
					.setDescription(`The amount of ${currentCommandEnglishTranslations.get("fullName")} to give`)
					.setRequired(true))
				.addStringOption(option => option.setName("users")
					.setDescription("The users' ids affected by the command (example : 'id1 id2 id3')")
					.setRequired(true)) as SlashCommandBuilder,
			executeCommand,
			requirements: {
				userPermission: Constants.ROLES.USER.BOT_OWNER
			},
			mainGuildCommand: true
		};
	}

	/**
	 * Get all the users called by the command
	 * @param usersToChange
	 * @param interaction
	 * @param changeValueModule
	 * @private
	 */
	static async getConcernedUsers(usersToChange: string[], interaction: CommandInteraction, changeValueModule: TranslationModule): Promise<Set<string>> {
		const users = new Set<string>();
		for (let i = 0; i < usersToChange.length; i++) {
			const mention = usersToChange[i];
			if (!isAMention(mention) && (parseInt(mention, 10) < 10 ** 17 || parseInt(mention, 10) >= 10 ** 18)) {
				await replyErrorMessage(
					interaction,
					changeValueModule.language,
					changeValueModule.format("errors.invalidIdOrMention", {
						position: i + 1,
						wrongText: usersToChange[i]
					})
				);
				return null;
			}
			users.add(isAMention(mention) ? getIdFromMention(mention) : mention);
		}
		return users;
	}

	/**
	 * Get the command to execute from the commandName
	 * @param commandName
	 * @param editFunction
	 * @private
	 */
	private static executeCommandFrom(
		commandName: string,
		editFunction: (playerToEdit: Player, amount: number, interaction: CommandInteraction, language: string) => void
	): (interaction: CommandInteraction, language: string) => Promise<void> {
		return async (interaction: CommandInteraction, language: string): Promise<void> => {
			const changeValueModule = Translations.getModule(`commands.${commandName}`, language);
			const amount = interaction.options.get("amount").value as number;
			if (amount > 10 ** 17) {
				await replyErrorMessage(
					interaction,
					language,
					changeValueModule.get("errors.invalidAmountFormat")
				);
				return;
			}
			const usersToChange = (interaction.options.get("users").value as string).split(" ");
			if (usersToChange.length > 50) {
				await replyErrorMessage(
					interaction,
					language,
					changeValueModule.get("errors.tooMuchPeople")
				);
				return;
			}

			const users = await this.getConcernedUsers(usersToChange, interaction, changeValueModule);
			if (!users) {
				return;
			}

			let descString = "";
			for (const user of users) {
				const playersToEdit = await Players.getByDiscordUserId(user);
				if (!playersToEdit) {
					await replyErrorMessage(
						interaction,
						language,
						changeValueModule.format("errors.invalidIdOrMentionDoesntExist", {
							position: usersToChange.indexOf(user) + 1,
							wrongText: user
						})
					);
					return;
				}
				const valueBefore = playersToEdit[changeValueModule.get("valueToEdit") as keyof Player];
				try {
					editFunction(playersToEdit, amount, interaction, language);
				}
				catch (e) {
					if (e.message !== "wrong parameter") {
						console.error(e.stack);
						return;
					}
					await replyErrorMessage(
						interaction,
						language,
						changeValueModule.get("errors.invalidDonationParameter")
					);
					return;
				}
				await playersToEdit.save();
				descString += changeValueModule.format("desc", {
					player: playersToEdit.getMention(),
					value: playersToEdit[changeValueModule.get("valueToEdit") as keyof Player]
				});
				const embed = new DraftBotEmbed()
					.setTitle(changeValueModule.get("dm.title"))
					.setDescription(changeValueModule.format("dm.description", {
						valueGained: playersToEdit[changeValueModule.get("valueToEdit") as keyof Player] - valueBefore
					}));
				await sendNotificationToPlayer(playersToEdit, embed, language);
			}
			await interaction.reply({
				embeds: [new DraftBotEmbed()
					.formatAuthor(changeValueModule.get("title"), interaction.user)
					.setDescription(descString)]
			});
		};
	}
}